import { toTemporalInstant } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/lib/Apply.js'
import * as A from 'fp-ts/lib/Array.js'
import * as E from 'fp-ts/lib/Either.js'
import * as NEA from 'fp-ts/lib/NonEmptyArray.js'
import * as O from 'fp-ts/lib/Option.js'
import { and } from 'fp-ts/lib/Predicate.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as T from 'fp-ts/lib/Task.js'
import { constVoid, flow, identity, pipe } from 'fp-ts/lib/function.js'
import { isString, toUpperCase } from 'fp-ts/lib/string.js'
import httpErrors, { type HttpError } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import {
  type DepositMetadata,
  type Deposition,
  type EmptyDeposition,
  type InProgressDeposition,
  type Record,
  type UnsubmittedDeposition,
  type ZenodoAuthenticatedEnv,
  type ZenodoEnv,
  createEmptyDeposition,
  depositionIsSubmitted,
  getCommunityRecords,
  getDeposition,
  getRecord,
  isOpenRecord,
  publishDeposition,
  unlockDeposition,
  updateDeposition,
  uploadFile,
} from 'zenodo-ts'
import { getClubByName, getClubName } from './club-details.js'
import { type SleepEnv, reloadCache, revalidateIfStale, timeoutRequest, useStaleCache } from './fetch.js'
import { type Html, plainText, sanitizeHtml } from './html.js'
import type { Prereview as PreprintPrereview } from './preprint-reviews-page/index.js'
import {
  type GetPreprintEnv,
  type GetPreprintIdEnv,
  type GetPreprintTitleEnv,
  getPreprint,
  getPreprintId,
  getPreprintTitle,
} from './preprint.js'
import { type PublicUrlEnv, toUrl } from './public-url.js'
import type { Prereview, Comment as PrereviewComment } from './review-page/index.js'
import type { Prereview as ReviewsDataPrereview } from './reviews-data/index.js'
import type { RecentPrereviews } from './reviews-page/index.js'
import { reviewMatch } from './routes.js'
import type { Prereview as ScietyPrereview } from './sciety-list/index.js'
import type { ClubId } from './types/club-id.js'
import { type FieldId, isFieldId } from './types/field.js'
import { ProfileId } from './types/index.js'
import { iso6391To3, iso6393To1, iso6393Validate } from './types/iso639.js'
import {
  type IndeterminatePreprintId,
  PreprintDoiD,
  type PreprintId,
  fromPreprintDoi,
  fromUrl,
} from './types/preprint-id.js'
import type { NonEmptyString } from './types/string.js'
import { isSubfieldId } from './types/subfield.js'
import type { User } from './user.js'
import type { NewPrereview } from './write-review/index.js'

export interface WasPrereviewRemovedEnv {
  wasPrereviewRemoved: (id: number) => boolean
}

export interface GetPreprintSubjectsEnv {
  getPreprintSubjects: (preprint: PreprintId) => T.Task<ReadonlyArray<{ id: URL; name: string }>>
}

export interface IsReviewRequestedEnv {
  isReviewRequested: (preprint: PreprintId) => T.Task<boolean>
}

const wasPrereviewRemoved = (id: number): R.Reader<WasPrereviewRemovedEnv, boolean> =>
  R.asks(({ wasPrereviewRemoved }) => wasPrereviewRemoved(id))

const getPreprintSubjects = (
  preprint: PreprintId,
): RT.ReaderTask<GetPreprintSubjectsEnv, ReadonlyArray<{ id: URL; name: string }>> =>
  R.asks(({ getPreprintSubjects }) => getPreprintSubjects(preprint))

const isReviewRequested = (preprint: PreprintId): RT.ReaderTask<IsReviewRequestedEnv, boolean> =>
  R.asks(({ isReviewRequested }) => isReviewRequested(preprint))

const getPrereviewsPageForSciety = flow(
  (page: number) =>
    new URLSearchParams({
      page: page.toString(),
      size: '100',
      sort: '-mostrecent',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.map(records => RA.chunksOf(20)(records.hits.hits)),
  RTE.chainReaderTaskKW(RT.traverseSeqArray(flow(RT.traverseArray(recordToScietyPrereview), RT.map(RA.rights)))),
  RTE.bimap(() => 'unavailable' as const, RA.flatten),
)

export const getPrereviewsForSciety = pipe(
  new URLSearchParams({
    page: '1',
    size: '1',
    resource_type: 'publication::publication-peerreview',
    access_status: 'open',
  }),
  getCommunityRecords('prereview-reviews'),
  RTE.mapLeft(() => 'unavailable' as const),
  RTE.chain(
    flow(
      records => Math.ceil(records.hits.total / 100),
      RNEA.makeBy(i => getPrereviewsPageForSciety(i + 1)),
      RTE.sequenceArray,
      RTE.map(RA.flatten),
    ),
  ),
)

export const getRecentPrereviewsFromZenodo = ({
  field,
  language,
  page,
  query,
}: {
  field?: FieldId
  language?: LanguageCode
  page: number
  query?: NonEmptyString
}) =>
  pipe(
    RTE.Do,
    RTE.let('currentPage', () => page),
    RTE.let('field', () => field),
    RTE.let('language', () => language),
    RTE.let('query', () => query),
    RTE.filterOrElse(
      ({ currentPage }) => currentPage > 0,
      () => 'not-found' as const,
    ),
    RTE.bindW(
      'records',
      flow(
        ({ currentPage, field, language }) =>
          new URLSearchParams({
            page: currentPage.toString(),
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
            q: [
              field ? `custom_fields.legacy\\:subjects.identifier:"https://openalex.org/fields/${field}"` : '',
              language ? `language:"${iso6391To3(language)}"` : '',
              query ? `(title:(${query}) OR metadata.creators.person_or_org.name:(${query}))` : '',
            ]
              .filter(a => a !== '')
              .join(' AND '),
          }),
        getCommunityRecords('prereview-reviews'),
      ),
    ),
    RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.bindW(
      'hits',
      RTE.fromOptionK(() => 'not-found' as const)(({ records }) => RNEA.fromReadonlyArray(records.hits.hits)),
    ),
    RTE.bindW(
      'recentPrereviews',
      flow(
        ({ hits }) => hits,
        RT.traverseArray(recordToRecentPrereview),
        RT.map(flow(RA.rights, E.fromOptionK(() => 'unavailable' as const)(RNEA.fromReadonlyArray))),
      ),
    ),
    flow(
      RTE.orElseFirstW(
        RTE.fromReaderIOK(
          flow(
            error =>
              match(error)
                .with(P.instanceOf(Error), error => O.some(error.message))
                .with({ status: P.number }, response => O.some(`${response.status} ${response.statusText}`))
                .with({ _tag: P.string }, error => O.some(D.draw(error)))
                .with('unavailable', O.some)
                .with('not-found', () => O.none)
                .exhaustive(),
            O.match(
              () => RIO.of(undefined),
              flow(error => ({ error }), L.errorP('Unable to get recent records from Zenodo')),
            ),
          ),
        ),
      ),
      RTE.bimap(
        error =>
          match(error)
            .with('not-found', identity)
            .otherwise(() => 'unavailable' as const),
        ({ currentPage, recentPrereviews, field, language, records, query }) => ({
          currentPage,
          field,
          language,
          query,
          recentPrereviews,
          totalPages: Math.ceil(records.hits.total / 5),
        }),
      ),
    ),
  )

export const getPrereviewFromZenodo = (id: number) =>
  pipe(
    RTE.fromReader(wasPrereviewRemoved(id)),
    RTE.filterOrElse(
      wasRemoved => !wasRemoved,
      () => 'removed' as const,
    ),
    RTE.chainW(() => getRecord(id)),
    RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv & WasPrereviewRemovedEnv>()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(pipe(isInCommunity, and(isPeerReview), and(isOpen)), () => 'not-found' as const),
    RTE.chainW(recordToPrereview),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error =>
            match(error)
              .with(P.intersection(P.instanceOf(Error), { status: P.number }), () => O.none)
              .with(P.instanceOf(Error), error => O.some(error.message))
              .with({ status: P.union(Status.NotFound, Status.Gone) }, () => O.none)
              .with({ status: P.number }, response => O.some(`${response.status} ${response.statusText}`))
              .with({ _tag: P.string }, error => O.some(D.draw(error)))
              .with('unknown-license', 'text-unavailable', 'unavailable', O.some)
              .with('no reviewed preprint', 'removed', 'not-found', () => O.none)
              .exhaustive(),
          O.match(
            () => RIO.of(undefined),
            flow(error => ({ error }), L.errorP('Unable to get record from Zenodo')),
          ),
        ),
      ),
    ),
    RTE.mapLeft(error =>
      match(error)
        .with('removed', () => 'removed' as const)
        .with(
          'no reviewed preprint',
          'not-found',
          { status: P.union(Status.NotFound, Status.Gone) },
          () => 'not-found' as const,
        )
        .otherwise(() => 'unavailable' as const),
    ),
  )

export const getPrereviewsForProfileFromZenodo = flow(
  (profile: ProfileId.ProfileId) =>
    new URLSearchParams({
      q: ProfileId.match(profile, {
        onOrcid: profile => `metadata.creators.person_or_org.identifiers.identifier:${profile.orcid}`,
        onPseudonym: profile => `metadata.creators.person_or_org.name:"${profile.pseudonym}"`,
      }),
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainReaderTaskKW(
    flow(records => records.hits.hits, RT.traverseArray(recordToRecentPrereview), RT.map(RA.rights)),
  ),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(
      flow(
        error => ({
          error: match(error)
            .with(P.instanceOf(Error), error => error.message)
            .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
            .with({ _tag: P.string }, D.draw)
            .exhaustive(),
        }),
        L.errorP('Unable to get records for profile from Zenodo'),
      ),
    ),
  ),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getPrereviewsForUserFromZenodo = flow(
  (user: User) =>
    new URLSearchParams({
      q: `metadata.creators.person_or_org.identifiers.identifier:${user.orcid} metadata.creators.person_or_org.name:"${user.pseudonym}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainReaderTaskKW(
    flow(records => records.hits.hits, RT.traverseArray(recordToRecentPrereview), RT.map(RA.rights)),
  ),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(
      flow(
        error => ({
          error: match(error)
            .with(P.instanceOf(Error), error => error.message)
            .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
            .with({ _tag: P.string }, D.draw)
            .exhaustive(),
        }),
        L.errorP('Unable to get records for user from Zenodo'),
      ),
    ),
  ),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getPrereviewsForClubFromZenodo = (club: ClubId) =>
  pipe(
    new URLSearchParams({
      q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
    getCommunityRecords('prereview-reviews'),
    RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error => ({
            error: match(error)
              .with(P.instanceOf(Error), error => error.message)
              .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
              .with({ _tag: P.string }, D.draw)
              .exhaustive(),
          }),
          L.errorP('Unable to get records for club from Zenodo'),
        ),
      ),
    ),
    RTE.chainReaderTaskKW(
      flow(records => records.hits.hits, RT.traverseArray(recordToRecentPrereview), RT.map(RA.rights)),
    ),
    RTE.bimap(
      () => 'unavailable' as const,
      RA.filter(recentPrereview => recentPrereview.club === club),
    ),
  )

export const getPrereviewsForPreprintFromZenodo = flow(
  (preprint: PreprintId) =>
    new URLSearchParams({
      q: `related.identifier:"${toExternalIdentifier(preprint).identifier}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainW(flow(records => records.hits.hits, RTE.traverseArray(recordToPreprintPrereview))),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(
      flow(
        error => ({
          error: match(error)
            .with(P.instanceOf(Error), error => error.message)
            .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
            .with({ _tag: P.string }, D.draw)
            .with('text-unavailable', identity)
            .exhaustive(),
        }),
        L.errorP('Unable to get records for preprint from Zenodo'),
      ),
    ),
  ),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getCommentsForPrereviewFromZenodo = flow(
  (id: Doi) =>
    new URLSearchParams({
      q: `related.identifier:"${id}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-other',
      access_status: 'open',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.local(revalidateIfStale<ZenodoEnv & SleepEnv>()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainW(flow(records => records.hits.hits, RTE.traverseArray(recordToPrereviewComment))),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(
      flow(
        error => ({
          error: match(error)
            .with(P.instanceOf(Error), error => error.message)
            .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
            .with({ _tag: P.string }, D.draw)
            .with('unknown-license', 'text-unavailable', identity)
            .exhaustive(),
        }),
        L.errorP('Unable to get comments for PREreview from Zenodo'),
      ),
    ),
  ),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const refreshPrereview = (id: number, user: User) =>
  pipe(
    getPrereviewFromZenodo(id),
    RTE.chainFirstW(review => getPrereviewsForPreprintFromZenodo(review.preprint.id)),
    RTE.chainFirstW(() => getPrereviewsForUserFromZenodo(user)),
    RTE.local(reloadCache()),
  )

export const addAuthorToRecordOnZenodo = (
  id: number,
  user: User,
  persona: 'public' | 'pseudonym',
): RTE.ReaderTaskEither<ZenodoAuthenticatedEnv, 'unavailable', void> =>
  pipe(
    getDeposition(id),
    RTE.filterOrElseW(depositionIsSubmitted, () => 'not published' as const),
    RTE.chainW(unlockDeposition),
    RTE.chainW(deposition =>
      updateDeposition(
        {
          ...deposition.metadata,
          creators: pipe(getAuthors(deposition), ({ named, anonymous }) =>
            pipe(
              NEA.fromReadonlyNonEmptyArray(named),
              A.appendW(persona === 'public' ? { name: user.name, orcid: user.orcid } : { name: user.pseudonym }),
              NEA.concatW(
                match(anonymous)
                  .with(P.number.gt(2), anonymous => [{ name: `${anonymous - 1} other authors` }])
                  .with(2, () => [{ name: '1 other author' }])
                  .otherwise(() => []),
              ),
            ),
          ),
        },
        deposition,
      ),
    ),
    RTE.chainW(publishDeposition),
    RTE.bimap(() => 'unavailable', constVoid),
  )

interface CommentToPublish {
  author: { name: NonEmptyString; orcid?: Orcid }
  comment: Html
  prereview: {
    doi: Doi
    id: number
    preprint: {
      id: PreprintId
      title: Html
    }
  }
}

export const createCommentOnZenodo = (
  comment: CommentToPublish,
): RTE.ReaderTaskEither<PublicUrlEnv & ZenodoAuthenticatedEnv & L.LoggerEnv, 'unavailable', [Doi, number]> =>
  pipe(
    RTE.Do,
    RTE.apSW('deposition', createEmptyDeposition()),
    RTE.apSW('metadata', RTE.fromReader(createDepositMetadataForComment(comment))),
    RTE.chainW(({ deposition, metadata }) => updateDeposition(metadata, deposition)),
    RTE.chainFirstW(
      uploadFile({
        name: 'comment.html',
        content: comment.comment.toString(),
      }),
    ),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error => ({
            error: match(error)
              .with(P.instanceOf(Error), error => error.message)
              .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
              .with({ _tag: P.string }, D.draw)
              .exhaustive(),
          }),
          L.errorP('Unable to create completed deposition on Zenodo'),
        ),
      ),
    ),
    RTE.bimap(
      () => 'unavailable',
      deposition => [deposition.metadata.prereserve_doi.doi, deposition.id],
    ),
  )

export const publishDepositionOnZenodo = (
  depositionId: number,
): RTE.ReaderTaskEither<ZenodoAuthenticatedEnv & L.LoggerEnv, 'unavailable', void> =>
  pipe(
    getDeposition(depositionId),
    RTE.filterOrElseW(depositionCanBePublished, identity),
    RTE.chainW(publishDeposition),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error => ({
            error: match(error)
              .with(P.instanceOf(Error), error => error.message)
              .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
              .with({ _tag: P.string }, D.draw)
              .with({ state: P.string }, deposition => `deposition is ${deposition.state}`)
              .exhaustive(),
          }),
          L.errorP('Unable to publish deposition on Zenodo'),
        ),
      ),
    ),
    RTE.bimap(() => 'unavailable', constVoid),
  )

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => RTE.ReaderTaskEither<
  PublicUrlEnv & ZenodoAuthenticatedEnv & GetPreprintSubjectsEnv & IsReviewRequestedEnv & L.LoggerEnv,
  'unavailable',
  [Doi, number]
> = newPrereview =>
  pipe(
    createEmptyDeposition(),
    RTE.bindTo('deposition'),
    RTE.apSW('subjects', RTE.rightReaderTask(getPreprintSubjects(newPrereview.preprint.id))),
    RTE.apSW('requested', RTE.rightReaderTask(isReviewRequested(newPrereview.preprint.id))),
    RTE.bindW(
      'metadata',
      RTE.fromReaderK(({ subjects, deposition, requested }) =>
        createDepositMetadata(deposition, newPrereview, subjects, requested),
      ),
    ),
    RTE.chainW(({ deposition, metadata }) => updateDeposition(metadata, deposition)),
    RTE.chainFirstW(
      uploadFile({
        name: 'review.html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chainW(publishDeposition),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error => ({
            error: match(error)
              .with(P.instanceOf(Error), error => error.message)
              .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
              .with({ _tag: P.string }, D.draw)
              .exhaustive(),
          }),
          L.errorP('Unable to create record on Zenodo'),
        ),
      ),
    ),
    RTE.bimap(
      () => 'unavailable',
      deposition => [deposition.metadata.doi, deposition.id],
    ),
  )

function createDepositMetadataForComment(comment: CommentToPublish) {
  return pipe(
    toUrl(reviewMatch.formatter, { id: comment.prereview.id }),
    R.map(
      url =>
        ({
          upload_type: 'publication',
          publication_type: 'other',
          title: plainText`Comment on a PREreview of “${comment.prereview.preprint.title}”`.toString(),
          creators: [comment.author],
          description: `<p><strong>This Zenodo record is a permanently preserved version of a comment on a PREreview. You can view the complete PREreview and comments at <a href="${url.href}">${url.href}</a>.</strong></p>

${comment.comment.toString()}`,
          communities: [{ identifier: 'prereview-reviews' }],
          related_identifiers: [
            {
              ...toExternalIdentifier(comment.prereview.preprint.id),
              relation: 'references',
              resource_type: 'publication-preprint',
            },
            {
              identifier: comment.prereview.doi,
              relation: 'references',
              resource_type: 'publication-peerreview',
              scheme: 'doi',
            },
          ],
        }) satisfies DepositMetadata,
    ),
  )
}

function createDepositMetadata(
  deposition: EmptyDeposition,
  newPrereview: NewPrereview,
  subjects: ReadonlyArray<{ id: URL; name: string }>,
  requested: boolean,
) {
  return pipe(
    toUrl(reviewMatch.formatter, { id: deposition.id }),
    R.map(
      url =>
        ({
          upload_type: 'publication',
          publication_type: 'peerreview',
          title: plainText`${newPrereview.structured ? 'Structured ' : ''}PREreview of “${
            newPrereview.preprint.title
          }”`.toString(),
          creators: pipe(
            NEA.of(
              newPrereview.persona === 'public'
                ? { name: newPrereview.user.name, orcid: newPrereview.user.orcid }
                : { name: newPrereview.user.pseudonym },
            ),
            NEA.concatW(
              match(newPrereview.otherAuthors.length)
                .with(P.number.gt(1), anonymous => [{ name: `${anonymous} other authors` }])
                .with(1, () => [{ name: '1 other author' }])
                .otherwise(() => []),
            ),
          ),
          language: O.toUndefined(newPrereview.language),
          description: `<p><strong>This Zenodo record is a permanently preserved version of a ${
            newPrereview.structured ? 'Structured ' : ''
          }PREreview. You can view the complete PREreview at <a href="${url.href}">${url.href}</a>.</strong></p>

${newPrereview.review.toString()}`,
          communities: [{ identifier: 'prereview-reviews' }],
          keywords: pipe(
            [
              requested ? 'Requested PREreview' : undefined,
              newPrereview.structured ? 'Structured PREreview' : undefined,
            ],
            A.filter(isString),
            A.matchW(() => undefined, identity),
          ),
          related_identifiers: [
            {
              ...toExternalIdentifier(newPrereview.preprint.id),
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
            {
              identifier: url.href,
              relation: 'isIdenticalTo',
              resource_type: 'publication-peerreview',
              scheme: 'url',
            },
          ],
          subjects: pipe(
            [...subjects],
            A.match(
              () => undefined,
              NEA.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })),
            ),
          ),
        }) satisfies DepositMetadata,
    ),
  )
}

export function toExternalIdentifier(preprint: IndeterminatePreprintId) {
  return match(preprint)
    .with({ type: 'philsci' }, preprint => ({
      scheme: 'url',
      identifier: `https://philsci-archive.pitt.edu/${preprint.value}/`,
    }))
    .with({ value: P.when(isDoi) }, preprint => ({
      scheme: 'doi',
      identifier: preprint.value,
    }))
    .exhaustive()
}

function recordToPrereview(
  record: Record,
): RTE.ReaderTaskEither<
  F.FetchEnv & GetPreprintEnv & L.LoggerEnv,
  HttpError<404> | 'no reviewed preprint' | 'unavailable' | 'not-found' | 'text-unavailable' | 'unknown-license',
  Prereview
> {
  return pipe(
    RTE.Do,
    RTE.apS('preprintId', getReviewedPreprintId(record)),
    RTE.apSW('reviewTextUrl', RTE.fromOption(() => new httpErrors.NotFound())(getReviewUrl(record))),
    RTE.apSW(
      'license',
      RTE.fromEither(
        pipe(
          PrereviewLicenseD.decode(record),
          E.mapLeft(() => 'unknown-license' as const),
        ),
      ),
    ),
    RTE.chainW(({ license, preprintId, reviewTextUrl }) =>
      sequenceS(RTE.ApplyPar)({
        addendum: RTE.right(pipe(O.fromNullable(record.metadata.notes), O.map(sanitizeHtml), O.toUndefined)),
        authors: RTE.right<F.FetchEnv & GetPreprintEnv & L.LoggerEnv>(getAuthors(record) as never),
        club: RTE.right(pipe(getReviewClub(record), O.toUndefined)),
        doi: RTE.right(record.metadata.doi),
        language: RTE.right(
          pipe(
            O.fromNullable(record.metadata.language),
            O.filter(iso6393Validate),
            O.match(() => undefined, iso6393To1),
          ),
        ),
        license: RTE.right(license),
        live: RTE.right(record.metadata.keywords?.includes('Live Review') === true),
        published: RTE.right(
          toTemporalInstant.call(record.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
        ),
        preprint: pipe(
          getPreprint(preprintId),
          RTE.map(preprint => ({
            id: preprint.id,
            title: preprint.title.text,
            language: preprint.title.language,
            url: preprint.url,
          })),
        ),
        requested: RTE.right(record.metadata.keywords?.includes('Requested PREreview') === true),
        structured: RTE.right(record.metadata.keywords?.includes('Structured PREreview') === true),
        text: getReviewText(reviewTextUrl),
      }),
    ),
  )
}

function recordToPrereviewComment(
  record: Record,
): RTE.ReaderTaskEither<
  F.FetchEnv & L.LoggerEnv,
  HttpError<404> | 'text-unavailable' | 'unknown-license',
  PrereviewComment
> {
  return pipe(
    RTE.Do,
    RTE.apSW('commentTextUrl', RTE.fromOption(() => new httpErrors.NotFound())(getReviewUrl(record))),
    RTE.apSW(
      'license',
      RTE.fromEither(
        pipe(
          PrereviewLicenseD.decode(record),
          E.mapLeft(() => 'unknown-license' as const),
        ),
      ),
    ),
    RTE.chainW(({ license, commentTextUrl }) =>
      sequenceS(RTE.ApplyPar)({
        authors: RTE.right({ named: getAuthors(record).named }),
        doi: RTE.right(record.metadata.doi),
        language: RTE.right(
          pipe(
            O.fromNullable(record.metadata.language),
            O.filter(iso6393Validate),
            O.match(() => undefined, iso6393To1),
          ),
        ),
        id: RTE.right(record.id),
        license: RTE.right(license),
        published: RTE.right(
          toTemporalInstant.call(record.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
        ),
        text: getReviewText(commentTextUrl),
      }),
    ),
  )
}

function recordToPreprintPrereview(
  record: Record,
): RTE.ReaderTaskEither<F.FetchEnv & L.LoggerEnv, HttpError<404> | 'text-unavailable', PreprintPrereview> {
  return pipe(
    RTE.fromOption(() => new httpErrors.NotFound())(getReviewUrl(record)),
    RTE.chainW(reviewTextUrl =>
      sequenceS(RTE.ApplyPar)({
        authors: RTE.right(getAuthors(record)),
        club: RTE.right(pipe(getReviewClub(record), O.toUndefined)),
        id: RTE.right(record.id),
        language: RTE.right(
          pipe(
            O.fromNullable(record.metadata.language),
            O.filter(iso6393Validate),
            O.match(() => undefined, iso6393To1),
          ),
        ),
        text: getReviewText(reviewTextUrl),
      }),
    ),
  )
}

function recordToScietyPrereview(
  record: Record,
): RTE.ReaderTaskEither<
  L.LoggerEnv & GetPreprintIdEnv,
  'no reviewed preprint' | 'not-a-preprint' | 'not-found' | 'unavailable',
  ScietyPrereview & ReviewsDataPrereview
> {
  return pipe(
    RTE.of(record),
    RTE.bindW('preprintId', flow(getReviewedPreprintId, RTE.chainW(getPreprintId))),
    RTE.map(review => ({
      preprint: review.preprintId,
      createdAt: toTemporalInstant.call(review.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
      doi: review.metadata.doi,
      authors: review.metadata.creators,
      language: pipe(
        O.fromNullable(review.metadata.language),
        O.filter(iso6393Validate),
        O.match(() => undefined, iso6393To1),
      ),
      type: record.metadata.keywords?.includes('Structured PREreview') === true ? 'structured' : 'full',
      club: pipe(getReviewClub(record), O.toUndefined),
      live: record.metadata.keywords?.includes('Live Review') === true,
      requested: record.metadata.keywords?.includes('Requested PREreview') === true,
    })),
  )
}

function recordToRecentPrereview(
  record: Record,
): RTE.ReaderTaskEither<
  GetPreprintTitleEnv & L.LoggerEnv,
  'no reviewed preprint' | 'unavailable' | 'not-found',
  RecentPrereviews['recentPrereviews'][number]
> {
  return pipe(
    getReviewedPreprintId(record),
    RTE.chainW(preprintId =>
      sequenceS(RTE.ApplyPar)({
        club: RTE.right(pipe(getReviewClub(record), O.toUndefined)),
        id: RTE.right(record.id),
        reviewers: RTE.right(pipe(record.metadata.creators, RNEA.map(get('name')))),
        published: RTE.right(
          toTemporalInstant.call(record.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
        ),
        fields: RTE.right(getReviewFields(record)),
        subfields: RTE.right(getReviewSubfields(record)),
        preprint: getPreprintTitle(preprintId),
      }),
    ),
  )
}

const PrereviewLicenseD: D.Decoder<Record, Prereview['license']> = pipe(
  D.struct({
    metadata: D.struct({
      license: D.struct({ id: pipe(D.string, D.map(toUpperCase), D.compose(D.literal('CC-BY-4.0'))) }),
    }),
  }),
  D.map(get('metadata.license.id')),
)

function getAuthors(record: Record | InProgressDeposition): Prereview['authors'] {
  const [named, last] = RNEA.unappend(record.metadata.creators)

  if (!RA.isNonEmpty(named)) {
    return { named: record.metadata.creators, anonymous: 0 }
  }

  const anonymous = pipe(
    O.fromNullable(/^([1-9][0-9]*) other authors?$/.exec(last.name)),
    O.chain(RA.lookup(1)),
    O.match(
      () => 0,
      number => parseInt(number, 10),
    ),
  )

  return match(anonymous)
    .with(P.number.positive(), anonymous => ({ named, anonymous }))
    .otherwise(() => ({ named: record.metadata.creators, anonymous: 0 }))
}

function isInCommunity(record: Record) {
  return pipe(
    O.fromNullable(record.metadata.communities),
    O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
    O.isSome,
  )
}

function isPeerReview(record: Record) {
  return record.metadata.resource_type.type === 'publication' && record.metadata.resource_type.subtype === 'peerreview'
}

function isOpen(record: Record) {
  return record.metadata.access_right === 'open'
}

const getReviewFields = flow(
  (record: Record) => record.metadata.subjects ?? [],
  RA.filterMap(
    flow(
      get('identifier'),
      O.fromNullableK(identifier => (/^https:\/\/openalex\.org\/fields\/(.+)$/.exec(identifier) ?? [])[1]),
      O.filter(isFieldId),
    ),
  ),
)

const getReviewSubfields = flow(
  (record: Record) => record.metadata.subjects ?? [],
  RA.filterMap(
    flow(
      get('identifier'),
      O.fromNullableK(identifier => (/^https:\/\/openalex\.org\/subfields\/(.+)$/.exec(identifier) ?? [])[1]),
      O.filter(isSubfieldId),
    ),
  ),
)

const getReviewClub = flow(
  (record: Record) => record.metadata.contributors ?? [],
  RA.findFirstMap(flow(get('name'), getClubByName)),
)

const getReviewUrl = flow(
  O.fromPredicate(isOpenRecord),
  O.map(record => record.files),
  O.chain(RA.findFirst(file => file.key.endsWith('.html'))),
  O.map(file => file.links.self),
)

const getReviewText = flow(
  F.Request('GET'),
  F.send,
  RTE.local(useStaleCache()),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.getText(E.toError)),
  RTE.map(sanitizeHtml),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(
      flow(
        error => ({
          error: match(error)
            .with(P.instanceOf(Error), error => error.message)
            .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
            .exhaustive(),
        }),
        L.errorP('Unable to get review text from Zenodo'),
      ),
    ),
  ),
  RTE.mapLeft(() => 'text-unavailable' as const),
)

const getReviewedPreprintId = (record: Record) =>
  pipe(
    RTE.fromNullable('no reviewed preprint' as const)(record.metadata.related_identifiers),
    RTE.chainOptionK(() => 'no reviewed preprint' as const)(
      A.findFirstMap(relatedIdentifier =>
        match(relatedIdentifier)
          .with(
            {
              relation: 'reviews',
              scheme: 'doi',
              resource_type: 'publication-preprint',
              identifier: P.select(),
            },
            flow(O.fromEitherK(PreprintDoiD.decode), O.map(fromPreprintDoi)),
          )
          .with(
            {
              relation: 'reviews',
              scheme: 'url',
              resource_type: 'publication-preprint',
              identifier: P.select(),
            },
            flow(O.fromEitherK(UrlD.decode), O.chain(fromUrl)),
          )
          .otherwise(() => O.none),
      ),
    ),
    RTE.orElseFirst(
      RTE.fromReaderIOK(error =>
        match(error)
          .with('no reviewed preprint', () => pipe({ zenodoRecord: record.id }, L.warnP('No reviewed preprint found')))
          .exhaustive(),
      ),
    ),
  )

const depositionCanBePublished = (deposition: Deposition): deposition is InProgressDeposition | UnsubmittedDeposition =>
  'publish' in deposition.links

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)
