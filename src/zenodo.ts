import { toTemporalInstant } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { and } from 'fp-ts/Predicate'
import * as R from 'fp-ts/Reader'
import * as RIO from 'fp-ts/ReaderIO'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, identity, pipe } from 'fp-ts/function'
import { type HttpError, NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import iso6391, { type LanguageCode } from 'iso-639-1'
import iso6393To1 from 'iso-639-3/to-1.json'
import * as L from 'logger-fp-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  type DepositMetadata,
  type EmptyDeposition,
  type Record,
  type ZenodoAuthenticatedEnv,
  createEmptyDeposition,
  getRecord,
  getRecords,
  publishDeposition,
  updateDeposition,
  uploadFile,
} from 'zenodo-ts'
import { getClubByName, getClubName } from './club-details'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import type { RecentPrereview } from './home'
import { plainText, sanitizeHtml } from './html'
import { type GetPreprintEnv, type GetPreprintTitleEnv, getPreprint, getPreprintTitle } from './preprint'
import type { Prereview as PreprintPrereview } from './preprint-reviews'
import { type PublicUrlEnv, toUrl } from './public-url'
import type { Prereview } from './review'
import { reviewMatch } from './routes'
import type { Prereview as ScietyPrereview } from './sciety-list'
import type { ClubId } from './types/club-id'
import {
  type IndeterminatePreprintId,
  PreprintDoiD,
  type PreprintId,
  fromPreprintDoi,
  fromUrl,
} from './types/preprint-id'
import type { ProfileId } from './types/profile-id'
import type { NewPrereview } from './write-review'

export interface WasPrereviewRemovedEnv {
  wasPrereviewRemoved: (id: number) => boolean
}

const wasPrereviewRemoved = (id: number): R.Reader<WasPrereviewRemovedEnv, boolean> =>
  R.asks(({ wasPrereviewRemoved }) => wasPrereviewRemoved(id))

const getPrereviewsPageForSciety = flow(
  (page: number) =>
    new URLSearchParams({
      communities: 'prereview-reviews',
      page: page.toString(),
      size: '100',
      sort: '-mostrecent',
      subtype: 'peerreview',
    }),
  getRecords,
  RTE.map(records => records.hits.hits),
  RTE.chainReaderTaskKW(flow(RT.traverseArray(recordToScietyPrereview), RT.map(RA.rights))),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getPrereviewsForSciety = pipe(
  new URLSearchParams({
    communities: 'prereview-reviews',
    page: '1',
    size: '1',
    subtype: 'peerreview',
  }),
  getRecords,
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

export const getRecentPrereviewsFromZenodo = flow(
  RTE.fromPredicate(
    (currentPage: number) => currentPage > 0,
    () => 'not-found' as const,
  ),
  RTE.bindTo('currentPage'),
  RTE.bindW(
    'records',
    flow(
      ({ currentPage }) =>
        new URLSearchParams({
          communities: 'prereview-reviews',
          page: currentPage.toString(),
          size: '5',
          sort: '-publication_date',
          subtype: 'peerreview',
        }),
      getRecords,
    ),
  ),
  RTE.local(revalidateIfStale()),
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
      flow(
        RT.map(flow(RA.rights, E.fromOptionK(() => 'unavailable' as const)(RNEA.fromReadonlyArray))),
        RTE.orElseFirstW(RTE.fromReaderIOK(() => L.error('Unable to load any recent PREreviews'))),
      ),
    ),
  ),
  RTE.bimap(
    error =>
      match(error)
        .with('not-found', identity)
        .otherwise(() => 'unavailable' as const),
    ({ currentPage, recentPrereviews, records }) => ({
      currentPage,
      recentPrereviews,
      totalPages: Math.ceil(records.hits.total / 5),
    }),
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
    RTE.local(revalidateIfStale()),
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
              .with({ status: P.number }, response => O.some(`${response.status} ${response.statusText}`))
              .with({ _tag: P.string }, error => O.some(D.draw(error)))
              .with('text-unavailable', 'unavailable', O.some)
              .with('removed', 'not-found', () => O.none)
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
        .with('not-found', { status: Status.NotFound }, () => 'not-found' as const)
        .otherwise(() => 'unavailable' as const),
    ),
  )

export const getPrereviewsForProfileFromZenodo = flow(
  (profile: ProfileId) =>
    new URLSearchParams({
      communities: 'prereview-reviews',
      q: match(profile)
        .with({ type: 'orcid', value: P.select() }, orcid => `creators.orcid:${orcid}`)
        .with({ type: 'pseudonym', value: P.select() }, pseudonym => `creators.name:"${pseudonym}"`)
        .exhaustive(),
      size: '100',
      sort: '-publication_date',
      subtype: 'peerreview',
    }),
  getRecords,
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainReaderTaskKW(
    flow(records => records.hits.hits, RT.traverseArray(recordToRecentPrereview), RT.map(RA.rights)),
  ),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const getPrereviewsForClubFromZenodo = (club: ClubId) =>
  pipe(
    new URLSearchParams({
      communities: 'prereview-reviews',
      q: `contributors.name:"${getClubName(club)}"`,
      size: '100',
      sort: '-publication_date',
      subtype: 'peerreview',
    }),
    getRecords,
    RTE.local(revalidateIfStale()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
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
      communities: 'prereview-reviews',
      q: `related.identifier:"${toExternalIdentifier(preprint).identifier}"`,
      size: '100',
      sort: '-publication_date',
      subtype: 'peerreview',
    }),
  getRecords,
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainW(flow(records => records.hits.hits, RTE.traverseArray(recordToPreprintPrereview))),
  RTE.mapLeft(() => 'unavailable' as const),
)

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<
  PublicUrlEnv & ZenodoAuthenticatedEnv & L.LoggerEnv,
  'unavailable',
  [Doi, number]
> = newPrereview =>
  pipe(
    createEmptyDeposition(),
    RTE.bindTo('deposition'),
    RTE.bindW(
      'metadata',
      RTE.fromReaderK(({ deposition }) => createDepositMetadata(deposition, newPrereview)),
    ),
    RTE.chainW(({ deposition, metadata }) => updateDeposition(metadata, deposition)),
    RTE.chainFirstW(
      uploadFile({
        name: 'review.html',
        type: 'text/html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chainW(publishDeposition),
    RTE.orElseFirstW(RTE.fromReaderIOK(() => L.error('Unable to create record on Zenodo'))),
    RTE.bimap(
      () => 'unavailable',
      deposition => [deposition.metadata.doi, deposition.id],
    ),
  )

function createDepositMetadata(deposition: EmptyDeposition, newPrereview: NewPrereview) {
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
          creators: [
            newPrereview.persona === 'public'
              ? { name: newPrereview.user.name, orcid: newPrereview.user.orcid }
              : { name: newPrereview.user.pseudonym },
          ],
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
  HttpError<404> | 'unavailable' | 'not-found' | 'text-unavailable' | D.DecodeError,
  Prereview
> {
  return pipe(
    RTE.of(record),
    RTE.bindW(
      'preprintId',
      flow(
        getReviewedPreprintId,
        RTE.mapLeft(() => new NotFound()),
      ),
    ),
    RTE.bindW('reviewTextUrl', RTE.fromOptionK(() => new NotFound())(getReviewUrl)),
    RTE.bindW('license', RTE.fromEitherK(PrereviewLicenseD.decode)),
    RTE.chainW(review =>
      sequenceS(RTE.ApplyPar)({
        addendum: RTE.right(pipe(O.fromNullable(review.metadata.notes), O.map(sanitizeHtml), O.toUndefined)),
        authors: RTE.right<F.FetchEnv & GetPreprintEnv & L.LoggerEnv>(review.metadata.creators as never),
        club: RTE.right(pipe(getReviewClub(review), O.toUndefined)),
        doi: RTE.right(review.metadata.doi),
        language: RTE.right(pipe(O.fromNullable(record.metadata.language), O.chain(iso633To1), O.toUndefined)),
        license: RTE.right(review.license),
        published: RTE.right(
          toTemporalInstant.call(review.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
        ),
        preprint: pipe(
          getPreprint(review.preprintId),
          RTE.map(preprint => ({
            id: preprint.id,
            title: preprint.title.text,
            language: preprint.title.language,
            url: preprint.url,
          })),
        ),
        structured: RTE.right(review.metadata.keywords?.includes('Structured PREreview') === true),
        text: getReviewText(review.reviewTextUrl),
      }),
    ),
  )
}

function recordToPreprintPrereview(
  record: Record,
): RTE.ReaderTaskEither<F.FetchEnv & L.LoggerEnv, HttpError<404> | 'text-unavailable', PreprintPrereview> {
  return pipe(
    RTE.of(record),
    RTE.bindW('reviewTextUrl', RTE.fromOptionK(() => new NotFound())(getReviewUrl)),
    RTE.chainW(review =>
      sequenceS(RTE.ApplyPar)({
        authors: RTE.right(review.metadata.creators),
        club: RTE.right(pipe(getReviewClub(review), O.toUndefined)),
        id: RTE.right(review.id),
        language: RTE.right(pipe(O.fromNullable(record.metadata.language), O.chain(iso633To1), O.toUndefined)),
        text: getReviewText(review.reviewTextUrl),
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
  RecentPrereview
> {
  return pipe(
    RTE.of(record),
    RTE.bindW('preprintId', getReviewedPreprintId),
    RTE.chainW(review =>
      sequenceS(RTE.ApplyPar)({
        club: RTE.right(pipe(getReviewClub(review), O.toUndefined)),
        id: RTE.right(review.id),
        reviewers: RTE.right(pipe(review.metadata.creators, RNEA.map(get('name')))),
        published: RTE.right(
          toTemporalInstant.call(review.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
        ),
        preprint: getPreprintTitle(review.preprintId),
      }),
    ),
  )
}

const PrereviewLicenseD: D.Decoder<Record, Prereview['license']> = pipe(
  D.fromStruct({ metadata: D.fromStruct({ license: D.fromStruct({ id: D.literal('CC-BY-4.0') }) }) }),
  D.map(get('metadata.license.id')),
)

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

const getReviewClub = flow(
  (record: Record) => record.metadata.contributors ?? [],
  RA.findFirstMap(flow(get('name'), getClubByName)),
)

const getReviewUrl = flow(
  (record: Record) => record.files,
  RA.findFirst(file => file.type === 'html'),
  O.map(get('links.self')),
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

function iso633To1(code: string): O.Option<LanguageCode> {
  return pipe(RR.lookup(code, iso6393To1), O.filter(iso6391Validate))
}

// https://github.com/meikidd/iso-639-1/pull/61
const iso6391Validate = iso6391.validate as (code: string) => code is LanguageCode
