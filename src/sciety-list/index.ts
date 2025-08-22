import type { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import { flow, Function, pipe } from 'effect'
import type { Json, JsonRecord } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import safeStableStringify from 'safe-stable-stringify'
import { match, P } from 'ts-pattern'
import type { NonEmptyString } from '../types/NonEmptyString.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

export interface Prereview {
  preprint: IndeterminatePreprintId
  createdAt: Temporal.PlainDate
  doi: Doi
  authors: ReadonlyArray<{ name: string }>
}

export interface GetPrereviewsEnv {
  getPrereviews: () => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const getPrereviews = (): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews()))

const ReadonlyArrayE = flow(E.array, E.readonly)

const StringE: E.Encoder<string, string | { toString: () => string }> = { encode: String }

const DoiE: E.Encoder<string, Doi> = StringE

const PlainDateE: E.Encoder<string, Temporal.PlainDate> = StringE

const PreprintIdE = {
  encode: id =>
    match(id)
      .with({ _tag: 'PhilsciPreprintId' }, ({ value }) => `https://philsci-archive.pitt.edu/${value}/`)
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

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env => D.literal(`Bearer ${env.scietyListToken}`).decode(authorizationHeader)),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const scietyList = (
  authorizationHeader: string,
): RTE.ReaderTaskEither<ScietyListEnv & GetPrereviewsEnv, 'forbidden' | 'unavailable', string> =>
  pipe(authorizationHeader, isAllowed, RTE.chainW(getPrereviews), RTE.map(PrereviewsE.encode), RTE.map(JsonE.encode))
