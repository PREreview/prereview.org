import { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import type { Json, JsonRecord } from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { constVoid, flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import * as E from 'io-ts/Encoder'
import type { LoggerEnv } from 'logger-fp-ts'
import safeStableStringify from 'safe-stable-stringify'
import { P, match } from 'ts-pattern'
import type { ZenodoEnv } from 'zenodo-ts'
import type { GetPreprintTitleEnv } from '../preprint'
import type { IndeterminatePreprintId } from '../preprint-id'
import type { NonEmptyString } from '../string'
import { getRecentPrereviewsFromZenodo } from '../zenodo'

import PlainDate = Temporal.PlainDate

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

interface Prereview {
  preprint: IndeterminatePreprintId
  createdAt: PlainDate
  doi: Doi
  authors: ReadonlyArray<{ name: string }>
}

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
  authors: ReadonlyArrayE(E.struct({ name: StringE })),
}) satisfies E.Encoder<JsonRecord, Prereview>

const PrereviewsE = ReadonlyArrayE(PrereviewE)

const JsonE: E.Encoder<string, Json> = { encode: safeStableStringify }

const getAllPrereviews = (): RTE.ReaderTaskEither<
  ZenodoEnv & GetPreprintTitleEnv & LoggerEnv,
  'unavailable',
  ReadonlyArray<Prereview>
> =>
  pipe(
    getRecentPrereviewsFromZenodo(1),
    RTE.map(data => data.recentPrereviews),
    RTE.bimap(
      () => 'unavailable' as const,
      RA.map(prereview => ({
        preprint: prereview.preprint.id,
        createdAt: prereview.published,
        doi: `10.5281/zenodo.${prereview.id}` as Doi,
        authors: pipe(
          prereview.reviewers,
          RA.map(reviewer => ({ name: reviewer })),
        ),
      })),
    ),
  )

const isAllowed = pipe(
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.bimap(() => 'forbidden' as const, constVoid),
)

export const scietyList = pipe(
  isAllowed,
  RM.chainReaderTaskEitherKW(getAllPrereviews),
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
