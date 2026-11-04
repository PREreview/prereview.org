import { Url, type UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, Schema } from 'effect'
import { Doi, NonEmptyString } from '../../../types/index.ts'

export type ReviewADatasetForm = IncompleteForm | CompletedForm

export type IncompleteForm = EmptyForm | InvalidForm

export class Invalid extends Data.TaggedError('Invalid')<{
  value: string
}> {}

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  whichDataset: Result.Result<never, Invalid | Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  whichDataset: Doi.Doi | URL
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { whichDataset } = yield* Schema.decodeEffect(WhichDatasetSchema)(body)

    return Option.match(
      Option.orElse(Doi.parse(whichDataset), () => Result.getSuccess(Url.fromString(whichDataset))),
      {
        onNone: () => new InvalidForm({ whichDataset: Result.fail(new Invalid({ value: whichDataset })) }),
        onSome: whichDataset => new CompletedForm({ whichDataset }),
      },
    )
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm({ whichDataset: Result.fail(new Missing()) }))),
)

const WhichDatasetSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      whichDataset: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
