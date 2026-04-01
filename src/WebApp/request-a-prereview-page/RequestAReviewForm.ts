import { Url } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'
import { Doi, NonEmptyString } from '../../types/index.ts'

export type RequestAReviewForm = IncompleteForm | CompletedForm

export type IncompleteForm = EmptyForm | InvalidForm

export class Invalid extends Data.TaggedError('Invalid')<{
  value: string
}> {}

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  whichPreprint: Either.Either<never, Invalid | Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  whichPreprint: Doi.Doi | URL
}> {}

export const fromBody = Effect.fn(
  function* (body: unknown) {
    const { whichPreprint } = yield* Schema.decodeUnknown(WhichPreprintSchema)(body)

    return Option.match(
      Option.orElse(Doi.parse(whichPreprint), () => Either.getRight(Url.fromString(whichPreprint))),
      {
        onNone: () => new InvalidForm({ whichPreprint: Either.left(new Invalid({ value: whichPreprint })) }),
        onSome: whichPreprint => new CompletedForm({ whichPreprint }),
      },
    )
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ whichPreprint: Either.left(new Missing()) }))),
)

const WhichPreprintSchema = Schema.Struct({
  whichPreprint: NonEmptyString.NonEmptyStringSchema,
})
