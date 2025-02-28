import { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import { flow, Function, pipe } from 'effect'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import safeStableStringify from 'safe-stable-stringify'
import { match, P } from 'ts-pattern'
import type { ScietyListEnv } from '../sciety-list/index.js'
import type { ClubId } from '../types/club-id.js'
import type { IndeterminatePreprintId, PreprintId } from '../types/preprint-id.js'
import { isPseudonym } from '../types/pseudonym.js'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  preprint: PreprintId
  createdAt: PlainDate
  doi: Doi
  authors: ReadonlyArray<{ name: string; orcid?: Orcid }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: ClubId
  live: boolean
  requested: boolean
}

export interface GetPrereviewsEnv {
  getPrereviews: () => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const getPrereviews = (): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews()))

const ReadonlyArrayE = flow(E.array, E.readonly)

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const DoiE: E.Encoder<string, Doi> = StringE

const PlainDateE: E.Encoder<string, PlainDate> = StringE

const PreprintIdE = {
  encode: id =>
    match(id)
      .with({ type: 'philsci' }, ({ value }) => `https://philsci-archive.pitt.edu/${value}/`)
      .with({ value: P.when(isDoi) }, ({ value }) => `doi:${value}`)
      .exhaustive(),
} satisfies E.Encoder<string, IndeterminatePreprintId>

const PrereviewE = pipe(
  E.struct({
    preprint: PreprintIdE,
    server: StringE,
    createdAt: PlainDateE,
    doi: DoiE,
    authors: ReadonlyArrayE(E.struct({ author: StringE, authorType: StringE })),
    type: StringE,
    live: E.id(),
    requested: E.id(),
  }),
  E.intersect(
    E.partial({
      language: StringE,
      club: StringE,
    }),
  ),
) satisfies E.Encoder<JsonRecord, TransformedPrereview>

interface TransformedPrereview {
  preprint: IndeterminatePreprintId
  server: string
  createdAt: PlainDate
  doi: Doi
  authors: ReadonlyArray<{ author: string; authorType: 'public' | 'pseudonym' }>
  language?: LanguageCode
  type: 'full' | 'structured'
  club?: ClubId
  live: boolean
  requested: boolean
}

const PrereviewsE = ReadonlyArrayE(PrereviewE)

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, Function.constVoid),
)

const transform = (prereview: Prereview): TransformedPrereview => ({
  preprint: prereview.preprint,
  server: prereview.preprint.type,
  createdAt: prereview.createdAt,
  doi: prereview.doi,
  authors: pipe(
    prereview.authors,
    RA.filter(author => author.orcid !== undefined || isPseudonym(author.name)),
    RA.map(author => ({
      author: author.orcid ?? author.name,
      authorType: author.orcid === undefined ? 'pseudonym' : 'public',
    })),
  ),
  language: prereview.language,
  type: prereview.type,
  club: prereview.club,
  live: prereview.live,
  requested: prereview.requested,
})

export const reviewsData = pipe(
  isAllowed,
  RM.chainReaderTaskEitherKW(getPrereviews),
  RM.map(RA.map(transform)),
  RM.map(PrereviewsE.encode),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType('application/json')),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(prereviews => RM.send(JsonE.encode(prereviews))),
  RM.orElseW(error =>
    match(error)
      .with('unavailable', () =>
        pipe(RM.status(Status.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
      )
      .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
      .exhaustive(),
  ),
)
