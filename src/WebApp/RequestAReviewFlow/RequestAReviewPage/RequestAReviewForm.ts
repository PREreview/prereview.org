import { Url, type UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, Schema } from 'effect'
import { Doi, NonEmptyString } from '../../../types/index.ts'

export type RequestAReviewForm = IncompleteForm | CompletedForm

export type IncompleteForm = EmptyForm | InvalidForm

export class Invalid extends Data.TaggedError('Invalid')<{
  value: string
}> {}

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  whichPreprint: Result.Result<never, Invalid | Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  whichPreprint: Doi.Doi | URL
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { whichPreprint } = yield* Schema.decodeEffect(WhichPreprintSchema)(body)

    return Option.match(
      Option.orElse(Doi.parse(whichPreprint), () => Result.getSuccess(Url.fromString(whichPreprint))),
      {
        onNone: () => new InvalidForm({ whichPreprint: Result.fail(new Invalid({ value: whichPreprint })) }),
        onSome: whichPreprint => new CompletedForm({ whichPreprint }),
      },
    )
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm({ whichPreprint: Result.fail(new Missing()) }))),
)

const WhichPreprintSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      whichPreprint: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
