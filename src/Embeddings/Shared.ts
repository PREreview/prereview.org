import { Data, Schema, Tuple, SchemaTransformation, Effect, Number, Option, SchemaGetter, SchemaIssue } from 'effect'
import { Float32ArraySchema } from './Float32Array.ts'

const NumberFromStringSchema = Schema.String.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect(string =>
      Option.match(Number.parse(string), {
        onNone: () => Effect.fail(new SchemaIssue.InvalidValue(undefined, string)),
        onSome: Effect.succeed,
      }),
    ),
    encode: SchemaGetter.String(),
  }),
)

export class UnableToGetMatches extends Data.TaggedError('UnableToGetMatches')<{
  cause?: unknown
}> {}

export class UnableToAddWorksWithRequests extends Data.TaggedError('UnableToAddWorksWithRequests')<{
  cause?: unknown
}> {}

export class UnableToDetectLanguage extends Data.TaggedError('UnableToDetectLanguage')<{
  cause?: unknown
}> {}

export class UnableToQuery extends Schema.TaggedError<UnableToQuery>()('UnableToQuery', {
  cause: Schema.optional(Schema.Defect()),
}) {}

export const PgVector = Schema.TemplateLiteralParser([
  '[',
  Schema.String.pipe(
    Schema.decodeTo(
      Schema.Array(Schema.String),
      SchemaTransformation.transform({
        decode: (string): ReadonlyArray<string> => string.split(','),
        encode: strings => strings.join(','),
      }),
    ),
    Schema.decodeTo(Schema.Array(NumberFromStringSchema)),
  ),
  ']',
]).pipe(
  Schema.decodeTo(
    Float32ArraySchema,
    SchemaTransformation.transform({ decode: Tuple.get(1), encode: dimensions => ['[', dimensions, ']'] as const }),
  ),
)

export type Embedding = Schema.Schema.Type<typeof PgVector>
