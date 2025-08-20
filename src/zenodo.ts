import { toTemporalInstant } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import { Array, Function, Option, Predicate, String, Struct, flow, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/lib/Apply.js'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import httpErrors, { type HttpError } from 'http-errors'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
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
import { timeoutRequest, useStaleCache } from './fetch.js'
import * as FptsToEffect from './FptsToEffect.js'
import { type Html, plainText, sanitizeHtml } from './html.js'
import type { Prereview as PreprintPrereview } from './preprint-reviews-page/index.js'
import type * as Preprint from './preprint.js'
import {
  type GetPreprintEnv,
  type GetPreprintIdEnv,
  type GetPreprintTitleEnv,
  getPreprint,
  getPreprintId,
  getPreprintTitle,
} from './preprint.js'
import * as Prereview from './Prereview.js'
import { type PublicUrlEnv, toUrl } from './public-url.js'
import type { Comment as PrereviewComment } from './review-page/index.js'
import type { Prereview as ReviewsDataPrereview } from './reviews-data/index.js'
import type { RecentPrereviews } from './reviews-page/index.js'
import { reviewMatch } from './routes.js'
import type { Prereview as ScietyPrereview } from './sciety-list/index.js'
import * as StatusCodes from './StatusCodes.js'
import type { ClubId } from './types/club-id.js'
import { isDomainId } from './types/domain.js'
import { type FieldId, isFieldId } from './types/field.js'
import { ProfileId } from './types/index.js'
import { iso6391To3, iso6393To1, iso6393Validate } from './types/iso639.js'
import type { NonEmptyString } from './types/NonEmptyString.js'
import {
  type IndeterminatePreprintId,
  PreprintDoiD,
  type PreprintId,
  fromPreprintDoi,
  fromUrl,
} from './types/preprint-id.js'
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
  RTE.map(records => Array.chunksOf(20)(records.hits.hits)),
  RTE.chainReaderTaskKW(
    RT.traverseSeqArray(
      flow(RT.traverseArray(recordToScietyPrereview), RT.map(Array.map(FptsToEffect.either)), RT.map(Array.getRights)),
    ),
  ),
  RTE.bimap(() => 'unavailable' as const, Array.flatten),
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
      Array.makeBy(i => getPrereviewsPageForSciety(i + 1)),
      RTE.sequenceArray,
      RTE.map(Array.flatten),
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
              query ? `(title:"${query}"~5 OR metadata.creators.person_or_org.name:"${query}"~5)` : '',
            ]
              .filter(a => a !== '')
              .join(' AND '),
          }),
        getCommunityRecords('prereview-reviews'),
      ),
    ),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.bindW(
      'hits',
      RTE.fromOptionK(() => 'not-found' as const)(({ records }) =>
        Option.liftPredicate(records.hits.hits, Array.isNonEmptyReadonlyArray),
      ),
    ),
    RTE.bindW(
      'recentPrereviews',
      flow(
        ({ hits }) => hits,
        RT.traverseArray(recordToRecentPrereview),
        RT.map(
          flow(
            Array.map(FptsToEffect.either),
            Array.getRights,
            E.fromOptionK(() => 'unavailable' as const)(
              Option.liftPredicate(prereviews => Array.isNonEmptyReadonlyArray(prereviews)),
            ),
          ),
        ),
      ),
    ),
    flow(
      RTE.orElseFirstW(
        RTE.fromReaderIOK(
          flow(
            error =>
              match(error)
                .with(P.instanceOf(Error), error => Option.some(error.message))
                .with({ status: P.number }, response => Option.some(`${response.status} ${response.statusText}`))
                .with({ _tag: P.string }, error => Option.some(D.draw(error)))
                .with('unavailable', Option.some)
                .with('not-found', Option.none)
                .exhaustive(),
            Option.match({
              onNone: () => RIO.of(undefined),
              onSome: flow(error => ({ error }), L.errorP('Unable to get recent records from Zenodo')),
            }),
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
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(
      pipe(isInCommunity, Predicate.and(isPeerReview), Predicate.and(isOpen)),
      () => 'not-found' as const,
    ),
    RTE.chainW(recordToPrereview),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(
        flow(
          error =>
            match(error)
              .with({ _tag: 'PreprintIsUnavailable' }, () => Option.some('unavailable' as const))
              .with({ _tag: 'PreprintIsNotFound' }, Option.none)
              .with(P.intersection(P.instanceOf(Error), { status: P.number }), Option.none)
              .with(P.instanceOf(Error), error => Option.some(error.message))
              .with({ status: P.union(StatusCodes.NotFound, StatusCodes.Gone) }, Option.none)
              .with({ status: P.number }, response => Option.some(`${response.status} ${response.statusText}`))
              .with({ _tag: P.string }, error => Option.some(D.draw(error)))
              .with('unknown-license', 'text-unavailable', Option.some)
              .with('no reviewed preprint', 'removed', 'not-found', Option.none)
              .exhaustive(),
          Option.match({
            onNone: () => RIO.of(undefined),
            onSome: flow(error => ({ error }), L.errorP('Unable to get record from Zenodo')),
          }),
        ),
      ),
    ),
    RTE.mapLeft(error =>
      match(error)
        .with('removed', () => new Prereview.PrereviewWasRemoved())
        .with(
          'no reviewed preprint',
          'not-found',
          { _tag: 'PreprintIsNotFound' },
          { status: P.union(StatusCodes.NotFound, StatusCodes.Gone) },
          () => new Prereview.PrereviewIsNotFound(),
        )
        .otherwise(() => new Prereview.PrereviewIsUnavailable()),
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
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainReaderTaskKW(
    flow(
      records => records.hits.hits,
      RT.traverseArray(recordToRecentPrereview),
      RT.map(Array.map(FptsToEffect.either)),
      RT.map(Array.getRights),
    ),
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
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainReaderTaskKW(
    flow(
      records => records.hits.hits,
      RT.traverseArray(recordToRecentPrereview),
      RT.map(Array.map(FptsToEffect.either)),
      RT.map(Array.getRights),
    ),
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
      q: `metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    }),
    getCommunityRecords('prereview-reviews'),
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
      flow(
        records => records.hits.hits,
        RT.traverseArray(recordToRecentPrereview),
        RT.map(Array.map(FptsToEffect.either)),
        RT.map(Array.getRights),
      ),
    ),
    RTE.bimap(
      () => 'unavailable' as const,
      Array.filter(recentPrereview => recentPrereview.club === club),
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
              named,
              Array.append(persona === 'public' ? { name: user.name, orcid: user.orcid } : { name: user.pseudonym }),
              Array.appendAll(
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
    RTE.bimap(() => 'unavailable', Function.constVoid),
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
    RTE.bimap(() => 'unavailable', Function.constVoid),
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
            Array.of(
              newPrereview.persona === 'public'
                ? { name: newPrereview.user.name, orcid: newPrereview.user.orcid }
                : { name: newPrereview.user.pseudonym },
            ),
            Array.appendAll(
              match(newPrereview.otherAuthors.length)
                .with(P.number.gt(1), anonymous => [{ name: `${anonymous} other authors` }])
                .with(1, () => [{ name: '1 other author' }])
                .otherwise(() => []),
            ),
          ),
          language: Option.getOrUndefined(newPrereview.language),
          description: `<p><strong>This Zenodo record is a permanently preserved version of a ${
            newPrereview.structured ? 'Structured ' : ''
          }PREreview. You can view the complete PREreview at <a href="${url.href}">${url.href}</a>.</strong></p>

${newPrereview.review.toString()}`,
          license: match(newPrereview.license)
            .with('CC-BY-4.0', () => 'cc-by-4.0')
            .with('CC0-1.0', () => 'cc-zero')
            .exhaustive(),
          communities: [{ identifier: 'prereview-reviews' }],
          keywords: pipe(
            [
              requested ? 'Requested PREreview' : undefined,
              newPrereview.structured ? 'Structured PREreview' : undefined,
            ],
            Array.filter(String.isString),
            Array.match({ onEmpty: () => undefined, onNonEmpty: value => [...value] }),
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
            Array.match({
              onEmpty: () => undefined,
              onNonEmpty: Array.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })),
            }),
          ),
        }) satisfies DepositMetadata,
    ),
  )
}

export function toExternalIdentifier(preprint: IndeterminatePreprintId) {
  return match(preprint)
    .with({ _tag: 'PhilsciPreprintId' }, preprint => ({
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
  | HttpError<404>
  | 'no reviewed preprint'
  | Preprint.PreprintIsUnavailable
  | Preprint.PreprintIsNotFound
  | 'text-unavailable'
  | 'unknown-license',
  Prereview.Prereview
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
        addendum: RTE.right(
          pipe(Option.fromNullable(record.metadata.notes), Option.map(sanitizeHtml), Option.getOrUndefined),
        ),
        authors: RTE.right<
          F.FetchEnv & GetPreprintEnv & L.LoggerEnv,
          Preprint.PreprintIsUnavailable | Preprint.PreprintIsNotFound | 'text-unavailable'
        >(getAuthors(record) as never),
        club: RTE.right(pipe(getReviewClub(record), Option.getOrUndefined)),
        doi: RTE.right(record.metadata.doi),
        id: RTE.right(record.id),
        language: RTE.right(
          pipe(
            Option.fromNullable(record.metadata.language),
            Option.filter(iso6393Validate),
            Option.match({ onNone: () => undefined, onSome: iso6393To1 }),
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
    RTE.map(args => new Prereview.Prereview(args)),
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
          E.filterOrElseW(license => license !== 'CC0-1.0', identity),
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
            Option.fromNullable(record.metadata.language),
            Option.filter(iso6393Validate),
            Option.match({ onNone: () => undefined, onSome: iso6393To1 }),
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
        club: RTE.right(pipe(getReviewClub(record), Option.getOrUndefined)),
        id: RTE.right(record.id),
        language: RTE.right(
          pipe(
            Option.fromNullable(record.metadata.language),
            Option.filter(iso6393Validate),
            Option.match({ onNone: () => undefined, onSome: iso6393To1 }),
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
  'no reviewed preprint' | Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
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
        Option.fromNullable(review.metadata.language),
        Option.filter(iso6393Validate),
        Option.match({ onNone: () => undefined, onSome: iso6393To1 }),
      ),
      type: record.metadata.keywords?.includes('Structured PREreview') === true ? 'structured' : 'full',
      club: pipe(getReviewClub(record), Option.getOrUndefined),
      live: record.metadata.keywords?.includes('Live Review') === true,
      requested: record.metadata.keywords?.includes('Requested PREreview') === true,
    })),
  )
}

function recordToRecentPrereview(
  record: Record,
): RTE.ReaderTaskEither<
  GetPreprintTitleEnv & L.LoggerEnv,
  'no reviewed preprint' | Preprint.PreprintIsUnavailable | Preprint.PreprintIsNotFound,
  RecentPrereviews['recentPrereviews'][number]
> {
  return pipe(
    getReviewedPreprintId(record),
    RTE.chainW(preprintId =>
      sequenceS(RTE.ApplyPar)({
        club: RTE.right(pipe(getReviewClub(record), Option.getOrUndefined)),
        id: RTE.right(record.id),
        reviewers: RTE.right(
          pipe(getAuthors(record), Struct.evolve({ named: authors => Array.map(authors, Struct.get('name')) })),
        ),
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

const PrereviewLicenseD: D.Decoder<Record, 'CC-BY-4.0' | 'CC0-1.0'> = pipe(
  D.struct({
    metadata: D.struct({
      license: D.struct({
        id: pipe(
          D.string,
          D.parse(id =>
            match(id.toLowerCase())
              .with('cc-by-4.0', () => D.success('CC-BY-4.0' as const))
              .with('cc-zero', () => D.success('CC0-1.0' as const))
              .otherwise(() => D.failure(id, 'Unexpected license ID')),
          ),
        ),
      }),
    }),
  }),
  D.map(({ metadata }) => metadata.license.id),
)

function getAuthors(record: Record | InProgressDeposition): Prereview.Prereview['authors'] {
  const [named, last] = Array.unappend(FptsToEffect.array(record.metadata.creators))

  if (!Array.isNonEmptyReadonlyArray(named)) {
    return { named: FptsToEffect.array(record.metadata.creators), anonymous: 0 }
  }

  const anonymous = pipe(
    Option.fromNullable(/^([1-9][0-9]*) other authors?$/.exec(last.name)),
    Option.flatMap(Array.get(1)),
    Option.match({
      onNone: () => 0,
      onSome: number => parseInt(number, 10),
    }),
  )

  return match(anonymous)
    .with(P.number.positive(), anonymous => ({ named, anonymous }))
    .otherwise(() => ({ named: FptsToEffect.array(record.metadata.creators), anonymous: 0 }))
}

function isInCommunity(record: Record) {
  return pipe(
    Option.fromNullable(record.metadata.communities),
    Option.flatMap(Array.findFirst(community => community.id === 'prereview-reviews')),
    Option.isSome,
  )
}

function isPeerReview(record: Record) {
  return record.metadata.resource_type.type === 'publication' && record.metadata.resource_type.subtype === 'peerreview'
}

function isOpen(record: Record) {
  return record.metadata.access_right === 'open'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getReviewDomains = flow(
  (record: Record) => record.metadata.subjects ?? Array.empty<Required<typeof record.metadata>['subjects'][number]>(),
  Array.filterMap(
    flow(
      Struct.get('identifier'),
      Option.liftNullable(identifier => (/^https:\/\/openalex\.org\/domains\/(.+)$/.exec(identifier) ?? [])[1]),
      Option.filter(isDomainId),
    ),
  ),
)

const getReviewFields = flow(
  (record: Record) => record.metadata.subjects ?? Array.empty<Required<typeof record.metadata>['subjects'][number]>(),
  Array.filterMap(
    flow(
      Struct.get('identifier'),
      Option.liftNullable(identifier => (/^https:\/\/openalex\.org\/fields\/(.+)$/.exec(identifier) ?? [])[1]),
      Option.filter(isFieldId),
    ),
  ),
)

const getReviewSubfields = flow(
  (record: Record) => record.metadata.subjects ?? Array.empty<Required<typeof record.metadata>['subjects'][number]>(),
  Array.filterMap(
    flow(
      Struct.get('identifier'),
      Option.liftNullable(identifier => (/^https:\/\/openalex\.org\/subfields\/(.+)$/.exec(identifier) ?? [])[1]),
      Option.filter(isSubfieldId),
    ),
  ),
)

const getReviewClub = flow(
  Option.liftNullable((record: Record) => record.metadata.contributors),
  Option.flatMap(Array.findFirst(flow(Struct.get('name'), getClubByName))),
)

const getReviewUrl = flow(
  Option.liftPredicate(isOpenRecord),
  Option.map(record => record.files),
  Option.flatMap(Array.findFirst(file => file.key.endsWith('.html'))),
  Option.map(file => file.links.self),
)

const getReviewText = flow(
  F.Request('GET'),
  F.send,
  RTE.local(useStaleCache()),
  RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
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
      Array.findFirst(relatedIdentifier =>
        match(relatedIdentifier)
          .with(
            {
              relation: 'reviews',
              scheme: 'doi',
              resource_type: 'publication-preprint',
              identifier: P.select(),
            },
            flow(FptsToEffect.eitherK(PreprintDoiD.decode), Option.getRight, Option.map(fromPreprintDoi)),
          )
          .with(
            {
              relation: 'reviews',
              scheme: 'url',
              resource_type: 'publication-preprint',
              identifier: P.select(),
            },
            flow(
              FptsToEffect.eitherK(UrlD.decode),
              Option.getRight,
              Option.andThen(fromUrl),
              Option.andThen(
                Array.match({
                  onEmpty: Option.none,
                  onNonEmpty: ([head, ...tail]) => (tail.length === 0 ? Option.some(head) : Option.none()),
                }),
              ),
            ),
          )
          .otherwise(Option.none),
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
