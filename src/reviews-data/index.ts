import { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import type { Json, JsonRecord } from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import type * as TE from 'fp-ts/TaskEither'
import { constVoid, flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import * as E from 'io-ts/Encoder'
import type { Orcid } from 'orcid-id-ts'
import safeStableStringify from 'safe-stable-stringify'
import { P, match } from 'ts-pattern'
import type { ScietyListEnv } from '../sciety-list'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import { isPseudonym } from '../types/pseudonym'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  preprint: IndeterminatePreprintId
  createdAt: PlainDate
  doi: Doi
  authors: ReadonlyArray<{ name: string; orcid?: Orcid }>
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

const PrereviewE = E.struct({
  preprint: PreprintIdE,
  createdAt: PlainDateE,
  doi: DoiE,
  author: StringE,
  authorType: StringE,
}) satisfies E.Encoder<JsonRecord, FlatPrereview>

interface FlatPrereview {
  preprint: IndeterminatePreprintId
  createdAt: PlainDate
  doi: Doi
  author: string
  authorType: 'public' | 'pseudonym'
}

const PrereviewsE = ReadonlyArrayE(PrereviewE)

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, constVoid),
)

const toFlatEntry = (prereview: Prereview): ReadonlyArray<FlatPrereview> =>
  pipe(
    prereview.authors,
    RA.filter(author => author.orcid !== undefined || isPseudonym(author.name)),
    RA.map(author => ({
      preprint: prereview.preprint,
      createdAt: prereview.createdAt,
      doi: prereview.doi,
      author: author.orcid ?? author.name,
      authorType: author.orcid === undefined ? 'pseudonym' : 'public',
    })),
  )

export const reviewsData = pipe(
  isAllowed,
  RM.chainReaderTaskEitherKW(getPrereviews),
  RM.map(RA.chain(toFlatEntry)),
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
