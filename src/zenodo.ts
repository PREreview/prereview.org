import { toTemporalInstant } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'
import { and } from 'fp-ts/Predicate'
import * as R from 'fp-ts/Reader'
import * as RIO from 'fp-ts/ReaderIO'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as T from 'fp-ts/Task'
import { constVoid, flow, identity, pipe } from 'fp-ts/function'
import { toUpperCase } from 'fp-ts/string'
import { type HttpError, NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import {
  type DepositMetadata,
  type EmptyDeposition,
  type InProgressDeposition,
  type Record,
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
import { getClubByName, getClubName } from './club-details'
import { type SleepEnv, reloadCache, revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { plainText, sanitizeHtml } from './html'
import { type GetPreprintEnv, type GetPreprintTitleEnv, getPreprint, getPreprintTitle } from './preprint'
import type { Prereview as PreprintPrereview } from './preprint-reviews-page'
import { type PublicUrlEnv, toUrl } from './public-url'
import type { Prereview } from './review-page'
import type { RecentPrereviews } from './reviews-page'
import { reviewMatch } from './routes'
import type { Prereview as ScietyPrereview } from './sciety-list'
import type { ClubId } from './types/club-id'
import { type FieldId, isFieldId } from './types/field'
import { iso6391To3, iso6393To1, iso6393Validate } from './types/iso639'
import {
  type IndeterminatePreprintId,
  PreprintDoiD,
  type PreprintId,
  fromPreprintDoi,
  fromUrl,
} from './types/preprint-id'
import type { ProfileId } from './types/profile-id'
import type { NonEmptyString } from './types/string'
import { isSubfieldId } from './types/subfield'
import type { User } from './user'
import type { NewPrereview } from './write-review'

export interface WasPrereviewRemovedEnv {
  wasPrereviewRemoved: (id: number) => boolean
}

export interface GetPreprintSubjectsEnv {
  getPreprintSubjects: (preprint: PreprintId) => T.Task<ReadonlyArray<{ id: URL; name: string }>>
}

const wasPrereviewRemoved = (id: number): R.Reader<WasPrereviewRemovedEnv, boolean> =>
  R.asks(({ wasPrereviewRemoved }) => wasPrereviewRemoved(id))

const getPreprintSubjects = (
  preprint: PreprintId,
): RT.ReaderTask<GetPreprintSubjectsEnv, ReadonlyArray<{ id: URL; name: string }>> =>
  R.asks(({ getPreprintSubjects }) => getPreprintSubjects(preprint))

const getPrereviewsPageForSciety = flow(
  (page: number) =>
    new URLSearchParams({
      page: page.toString(),
      size: '100',
      sort: '-mostrecent',
      resource_type: 'publication::publication-peerreview',
    }),
  getCommunityRecords('prereview-reviews'),
  RTE.map(records => records.hits.hits),
  RTE.chainReaderTaskKW(flow(RT.traverseArray(recordToScietyPrereview), RT.map(RA.rights))),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getPrereviewsForSciety = pipe(
  new URLSearchParams({
    page: '1',
    size: '1',
    resource_type: 'publication::publication-peerreview',
  }),
  getCommunityRecords('prereview-reviews'),
  RTE.mapLeft(() => 'unavailable' as const),
  RTE.chain(
    flow(
      records => Math.ceil(records.hits.total / 100),
      RNEA.makeBy(i => getPrereviewsPageForSciety(i + 1)),
      RTE.sequenceSeqArray,
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
            q: [
              field ? `custom_fields.legacy\\:subjects.identifier:"https://openalex.org/fields/${field}"` : '',
              language ? `language:"${iso6391To3(language)}"` : '',
              query ?? '',
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
    RTE.filterOrElseW(pipe(isInCommunity, and(isPeerReview)), () => 'not-found' as const),
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
  (profile: ProfileId) =>
    new URLSearchParams({
      q: match(profile)
        .with(
          { type: 'orcid', value: P.select() },
          orcid => `metadata.creators.person_or_org.identifiers.identifier:${orcid}`,
        )
        .with(
          { type: 'pseudonym', value: P.select() },
          pseudonym => `metadata.creators.person_or_org.name:"${pseudonym}"`,
        )
        .exhaustive(),
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
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
): ReaderTaskEither<ZenodoAuthenticatedEnv, 'unavailable', void> =>
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

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<
  PublicUrlEnv & ZenodoAuthenticatedEnv & GetPreprintSubjectsEnv & L.LoggerEnv,
  'unavailable',
  [Doi, number]
> = newPrereview =>
  pipe(
    createEmptyDeposition(),
    RTE.bindTo('deposition'),
    RTE.apSW('subjects', RTE.rightReaderTask(getPreprintSubjects(newPrereview.preprint.id))),
    RTE.bindW(
      'metadata',
      RTE.fromReaderK(({ subjects, deposition }) => createDepositMetadata(deposition, newPrereview, subjects)),
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

function createDepositMetadata(
  deposition: EmptyDeposition,
  newPrereview: NewPrereview,
  subjects: ReadonlyArray<{ id: URL; name: string }>,
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
          keywords: newPrereview.structured ? ['Structured PREreview'] : undefined,
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
    RTE.apSW('reviewTextUrl', RTE.fromOption(() => new NotFound())(getReviewUrl(record))),
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
        structured: RTE.right(record.metadata.keywords?.includes('Structured PREreview') === true),
        text: getReviewText(reviewTextUrl),
      }),
    ),
  )
}

function recordToPreprintPrereview(
  record: Record,
): RTE.ReaderTaskEither<F.FetchEnv & L.LoggerEnv, HttpError<404> | 'text-unavailable', PreprintPrereview> {
  return pipe(
    RTE.fromOption(() => new NotFound())(getReviewUrl(record)),
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
): RTE.ReaderTaskEither<L.LoggerEnv, 'no reviewed preprint', ScietyPrereview> {
  return pipe(
    RTE.of(record),
    RTE.bindW('preprintId', getReviewedPreprintId),
    RTE.map(review => ({
      preprint: review.preprintId,
      createdAt: toTemporalInstant.call(review.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
      doi: review.metadata.doi,
      authors: review.metadata.creators,
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
    O.fromNullable(last.name.match(/^([1-9][0-9]*) other authors?$/)),
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

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)
