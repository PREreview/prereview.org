import { Url, UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'
import { Doi, NonEmptyString } from '../../types/index.ts'

export type ReviewADatasetForm = IncompleteForm | CompletedForm

export type IncompleteForm = EmptyForm | InvalidForm

export class Invalid extends Data.TaggedError('Invalid')<{
  value: string
}> {}

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  whichDataset: Either.Either<never, Invalid | Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  whichDataset: Doi.Doi | URL
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { whichDataset } = yield* Schema.decode(WhichDatasetSchema)(body)

    return Option.match(
      Option.orElse(Doi.parse(whichDataset), () => Either.getRight(Url.fromString(whichDataset))),
      {
        onNone: () => new InvalidForm({ whichDataset: Either.left(new Invalid({ value: whichDataset })) }),
        onSome: whichDataset => new CompletedForm({ whichDataset }),
      },
    )
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ whichDataset: Either.left(new Missing()) }))),
)

const WhichDatasetSchema = UrlParams.schemaRecord(
  Schema.Struct({
    whichDataset: NonEmptyString.NonEmptyStringSchema,
  }),
)
