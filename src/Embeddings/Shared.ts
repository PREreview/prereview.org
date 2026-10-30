import { Data, Schema, Tuple } from 'effect'
import { Float32ArraySchema } from './Float32Array.ts'

export class UnableToGetSurveyPapers extends Data.TaggedError('UnableToGetSurveyPapers')<{
  cause?: unknown
}> {}

export class UnableToAddPreprints extends Data.TaggedError('UnableToAddPreprints')<{
  cause?: unknown
}> {}

export class UnableToDetectLanguage extends Data.TaggedError('UnableToDetectLanguage')<{
  cause?: unknown
}> {}

export class UnableToQuery extends Schema.TaggedError<UnableToQuery>()('UnableToQuery', {
  cause: Schema.optional(Schema.Defect),
}) {}

export const PgVector = Schema.transform(
  Schema.TemplateLiteralParser('[', Schema.compose(Schema.split(','), Schema.Array(Schema.NumberFromString)), ']'),
  Float32ArraySchema,
  {
    strict: true,
    decode: Tuple.at(1),
    encode: dimensions => ['[', dimensions, ']'] as const,
  },
)

export type Embedding = Schema.Schema.Type<typeof PgVector>
