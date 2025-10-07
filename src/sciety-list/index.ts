import { Either, flow, Function, pipe, Schema, Tuple } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as Preprints from '../Preprints/index.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import { Doi, Temporal } from '../types/index.ts'

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

export interface Prereview {
  preprint: Preprints.IndeterminatePreprintId
  createdAt: Temporal.PlainDate
  doi: Doi.Doi
  authors: ReadonlyArray<{ name: string }>
}

export interface GetPrereviewsEnv {
  getPrereviews: () => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const getPrereviews = (): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews()))

const PreprintIdWithDoiSchema = Schema.transform(
  Schema.TemplateLiteralParser('doi:', Preprints.IndeterminatePreprintIdFromDoiSchema),
  Schema.typeSchema(Preprints.IndeterminatePreprintIdWithDoi),
  {
    strict: true,
    decode: Tuple.at(1),
    encode: id => Tuple.make('doi:' as const, id),
  },
)

const PreprintIdFromPhilsciIdSchema = Schema.transform(
  Schema.NonNegativeInt,
  Schema.typeSchema(Preprints.PhilsciPreprintId),
  { strict: true, decode: id => new Preprints.PhilsciPreprintId({ value: id }), encode: id => id.value },
)

const PhilsciPreprintIdSchema = Schema.transform(
  Schema.TemplateLiteralParser('https://philsci-archive.pitt.edu/', PreprintIdFromPhilsciIdSchema, '/'),
  Schema.typeSchema(Preprints.PhilsciPreprintId),
  {
    strict: true,
    decode: Tuple.at(1),
    encode: id => Tuple.make('https://philsci-archive.pitt.edu/' as const, id, '/' as const),
  },
)

const PreprintIdSchema = Schema.Union(PreprintIdWithDoiSchema, PhilsciPreprintIdSchema)

const PrereviewSchema = Schema.Struct({
  preprint: PreprintIdSchema,
  createdAt: Temporal.PlainDateSchema,
  doi: Doi.DoiSchema,
  authors: Schema.Array(Schema.Struct({ name: Schema.String })),
})

const isAllowed = (authorizationHeader: string) =>
  pipe(
    RTE.ask<ScietyListEnv>(),
    RTE.chainEitherK(env =>
      Schema.decodeUnknownEither(Schema.TemplateLiteralParser('Bearer ', env.scietyListToken))(authorizationHeader),
    ),
    RTE.bimap(() => 'forbidden' as const, Function.constVoid),
  )

export const scietyList = (
  authorizationHeader: string,
): RTE.ReaderTaskEither<ScietyListEnv & GetPrereviewsEnv, 'forbidden' | 'unavailable', string> =>
  pipe(
    authorizationHeader,
    isAllowed,
    RTE.chainW(getPrereviews),
    RTE.chainEitherKW(
      flow(
        Schema.encodeEither(Schema.parseJson(Schema.Array(PrereviewSchema))),
        Either.mapLeft(() => 'unavailable' as const),
      ),
    ),
  )
