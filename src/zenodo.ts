import { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { and } from 'fp-ts/Predicate'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as TE from 'fp-ts/TaskEither'
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
  type Record,
  type ZenodoAuthenticatedEnv,
  createDeposition,
  getRecord,
  getRecords,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import type { RecentPrereview } from './home'
import { html, plainText, sanitizeHtml } from './html'
import { type GetPreprintEnv, type GetPreprintTitleEnv, getPreprint, getPreprintTitle } from './preprint'
import { type IndeterminatePreprintId, PreprintDoiD, type PreprintId, fromPreprintDoi, fromUrl } from './preprint-id'
import type { Prereviews } from './profile'
import type { Prereview } from './review'
import type { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

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

export const getPrereviewsForOrcidFromZenodo = () =>
  TE.of([
    {
      id: 6577344,
      reviewers: ['Ahmet Bakirbas', 'Allison Barnes', 'JOHN LILLY JIMMY', 'Daniela Saderi', 'ARPITA YADAV'],
      published: PlainDate.from('2022-05-24'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/2021.06.10.447945' as Doi<'1101'> },
        language: 'en',
        title: html`Ovule siRNAs methylate protein-coding genes in <i>trans</i>`,
      },
    },
    {
      id: 6323771,
      reviewers: [
        'JOHN LILLY JIMMY',
        'Priyanka Joshi',
        'Dilip Kumar',
        'Neha Nandwani',
        'Ritam Neupane',
        'Ailis OCarroll',
        'Guto Rhys',
        'Javier Aguirre Rivera',
        'Daniela Saderi',
        'Mohammad Salehin',
        'Agata Witkowska',
      ],
      published: PlainDate.from('2022-03-02'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/2021.11.05.467508' as Doi<'1101'> },
        language: 'en',
        title: html`Biochemical analysis of deacetylase activity of rice sirtuin OsSRT1, a class IV member in plants`,
      },
    },
    {
      id: 5767994,
      reviewers: [
        'Daniela Saderi',
        'Sonisilpa Mohapatra',
        'Nikhil Bhandarkar',
        'Antony Gruness',
        'Isha Soni',
        'Iratxe Puebla',
        'Jessica Polka',
      ],
      published: PlainDate.from('2021-12-08'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/2021.10.21.465111' as Doi<'1101'> },
        language: 'en',
        title: html`Assessment of <i>Agaricus bisporus</i> Mushroom as Protective Agent Against Ultraviolet Exposure`,
      },
    },
    {
      id: 5551162,
      reviewers: [
        'Daniela Saderi',
        'Katrina Murphy',
        'Leire Abalde-Atristain',
        'Cole Brashaw',
        'Robin Elise Champieux',
        'PREreview.org community member',
      ],
      published: PlainDate.from('2021-10-05'),
      preprint: {
        id: { type: 'medrxiv', value: '10.1101/2021.07.28.21260814' as Doi<'1101'> },
        language: 'en',
        title: html`Influence of social determinants of health and county vaccination rates on machine learning models
        to predict COVID-19 case growth in Tennessee`,
      },
    },
    {
      id: 7621712,
      reviewers: ['Daniela Saderi'],
      published: PlainDate.from('2018-09-06'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/410472' as Doi<'1101'> },
        language: 'en',
        title: html`EMT network-based feature selection improves prognosis prediction in lung adenocarcinoma`,
      },
    },
    {
      id: 7621012,
      reviewers: ['Daniela Saderi'],
      published: PlainDate.from('2017-09-28'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/193268' as Doi<'1101'> },
        language: 'en',
        title: html`Age-related decline in behavioral discrimination of amplitude modulation frequencies compared to
        envelope-following responses`,
      },
    },
    {
      id: 7620977,
      reviewers: ['Daniela Saderi'],
      published: PlainDate.from('2017-04-10'),
      preprint: {
        id: { type: 'biorxiv', value: '10.1101/124750' as Doi<'1101'> },
        language: 'en',
        title: html`Cortical Representations of Speech in a Multi-talker Auditory Scene`,
      },
    },
  ] satisfies Prereviews)

export const getPrereviewsFromZenodo = flow(
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
  RTE.bimap(
    () => 'unavailable' as const,
    flow(
      records => records.hits.hits,
      RA.map(record => ({
        authors: record.metadata.creators,
        id: record.id,
        language: pipe(O.fromNullable(record.metadata.language), O.chain(iso633To1), O.toUndefined),
        text: sanitizeHtml(record.metadata.description),
      })),
    ),
  ),
)

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, unknown, [Doi, number]> = newPrereview =>
  pipe(
    createDepositMetadata(newPrereview),
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'review.html',
        type: 'text/html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chain(publishDeposition),
    RTE.map(deposition => [deposition.metadata.doi, deposition.id]),
  )

function createDepositMetadata(newPrereview: NewPrereview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'peerreview',
    title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
    creators: [
      newPrereview.persona === 'public'
        ? { name: newPrereview.user.name, orcid: newPrereview.user.orcid }
        : { name: newPrereview.user.pseudonym },
    ],
    description: newPrereview.review.toString(),
    communities: [{ identifier: 'prereview-reviews' }],
    related_identifiers: [
      {
        ...toExternalIdentifier(newPrereview.preprint.id),
        relation: 'reviews',
        resource_type: 'publication-preprint',
      },
    ],
  }
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
        doi: RTE.right(review.metadata.doi),
        language: RTE.right(pipe(O.fromNullable(record.metadata.language), O.chain(iso633To1), O.toUndefined)),
        license: RTE.right(review.license),
        published: RTE.right(PlainDate.from(review.metadata.publication_date.toISOString().split('T')[0])),
        preprint: pipe(
          getPreprint(review.preprintId),
          RTE.map(preprint => ({
            id: preprint.id,
            title: preprint.title.text,
            language: preprint.title.language,
            url: preprint.url,
          })),
        ),
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
        id: RTE.right(review.id),
        reviewers: RTE.right(pipe(review.metadata.creators, RNEA.map(get('name')))),
        published: RTE.right(PlainDate.from(review.metadata.publication_date.toISOString().split('T')[0])),
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
