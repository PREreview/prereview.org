import { toTemporalInstant } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { and } from 'fp-ts/Predicate'
import * as R from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, identity, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
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
import { getClubName } from './club-details'
import type { ClubId } from './club-id'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import type { RecentPrereview } from './home'
import { plainText, sanitizeHtml } from './html'
import { type GetPreprintEnv, type GetPreprintTitleEnv, getPreprint, getPreprintTitle } from './preprint'
import { type IndeterminatePreprintId, PreprintDoiD, type PreprintId, fromPreprintDoi, fromUrl } from './preprint-id'
import type { Prereview as PreprintPrereview } from './preprint-reviews'
import type { ProfileId } from './profile-id'
import { type PublicUrlEnv, toUrl } from './public-url'
import type { Prereview } from './review'
import { reviewMatch } from './routes'
import type { NewPrereview } from './write-review'

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

export const getPrereviewFromZenodo = flow(
  getRecord,
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(pipe(isInCommunity, and(isPeerReview)), () => new NotFound()),
  RTE.chain(recordToPrereview),
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

export const getPrereviewsForClubFromZenodo = flow(
  (club: ClubId) =>
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
  RTE.mapLeft(() => 'unavailable' as const),
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
) => ReaderTaskEither<PublicUrlEnv & ZenodoAuthenticatedEnv & L.LoggerEnv, unknown, [Doi, number]> = newPrereview =>
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
    RTE.map(deposition => [deposition.metadata.doi, deposition.id]),
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
): RTE.ReaderTaskEither<F.FetchEnv & GetPreprintEnv & L.LoggerEnv, unknown, Prereview> {
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
        authors: RTE.right<F.FetchEnv & GetPreprintEnv>(review.metadata.creators as never),
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

function recordToPreprintPrereview(record: Record): RTE.ReaderTaskEither<F.FetchEnv, unknown, PreprintPrereview> {
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

function recordToRecentPrereview(
  record: Record,
): RTE.ReaderTaskEither<GetPreprintTitleEnv & L.LoggerEnv, unknown, RecentPrereview> {
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
  RA.findFirstMap(contributor =>
    match(contributor)
      .returnType<O.Option<ClubId>>()
      .with({ type: 'ResearchGroup', name: getClubName('asapbio-cancer-biology') }, () =>
        O.some('asapbio-cancer-biology'),
      )
      .with({ type: 'ResearchGroup', name: getClubName('asapbio-meta-research') }, () =>
        O.some('asapbio-meta-research'),
      )
      .with({ type: 'ResearchGroup', name: getClubName('asapbio-metabolism') }, () => O.some('asapbio-metabolism'))
      .with({ type: 'ResearchGroup', name: getClubName('asapbio-neurobiology') }, () => O.some('asapbio-neurobiology'))
      .otherwise(() => O.none),
  ),
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
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'no text'),
  RTE.chainTaskEitherK(F.getText(identity)),
  RTE.map(sanitizeHtml),
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
