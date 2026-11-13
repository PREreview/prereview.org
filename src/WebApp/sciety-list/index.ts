import { Result, flow, Function, pipe, Schema, Tuple, SchemaTransformation } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as Preprints from '../../Domain/Preprints/index.ts'
import { type Name, Doi, Temporal } from '../../types/index.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { EffectToFpts } from '../../RefactoringUtilities/index.ts'

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

export interface Prereview {
  preprint: Preprints.IndeterminatePreprintId
  createdAt: Temporal.PlainDate
  doi: Doi.Doi
  authors: ReadonlyArray<{ name: Name.Name }>
}

export interface GetPrereviewsEnv {
  getPrereviews: () => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

const getPrereviews = (): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews()))

const PreprintIdWithDoiSchema = Schema.TemplateLiteralParser([
  'doi:',
  Preprints.IndeterminatePreprintIdFromDoiSchema,
]).pipe(
  Schema.decodeTo(
    Schema.toType(Preprints.IndeterminatePreprintIdWithDoi),
    SchemaTransformation.transform({ decode: Tuple.get(1), encode: id => ['doi:', id] as const }),
  ),
)

const PreprintIdFromPhilsciIdSchema = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.decodeTo(
    Schema.toType(Preprints.PhilsciPreprintId),
    SchemaTransformation.transform({
      decode: id => new Preprints.PhilsciPreprintId({ value: id }),
      encode: id => id.value,
    }),
  ),
)

const PhilsciPreprintIdSchema = Schema.TemplateLiteralParser([
  'https://philsci-archive.pitt.edu/',
  PreprintIdFromPhilsciIdSchema,
  '/',
]).pipe(
  Schema.decodeTo(
    Schema.toType(Preprints.PhilsciPreprintId),
    SchemaTransformation.transform({
      decode: Tuple.get(1),
      encode: id => ['https://philsci-archive.pitt.edu/', id, '/'] as const,
    }),
  ),
)

const PreprintIdSchema = Schema.Union([PreprintIdWithDoiSchema, PhilsciPreprintIdSchema])

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
      EffectToFpts.either(
        Schema.decodeUnknownResult(Schema.TemplateLiteralParser(['Bearer ', env.scietyListToken]))(authorizationHeader),
      ),
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
        Schema.encodeResult(Schema.fromJsonString(Schema.Array(PrereviewSchema))),
        Result.mapError(() => 'unavailable' as const),
        EffectToFpts.either,
      ),
    ),
  )
