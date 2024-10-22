import { Data, Effect, Either, Match, pipe, Schema } from 'effect'
import type * as Feedback from '../../Feedback/index.js'

export type CodeOfConductForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  agree: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm') {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    yield* Schema.decodeUnknown(AgreeFieldSchema)(body)

    return new CompletedForm()
  }).pipe(Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ agree: Either.left(new Missing()) }))))

export const fromFeedback = pipe(
  Match.type<Feedback.FeedbackInProgress | Feedback.FeedbackReadyForPublishing>(),
  Match.tag('FeedbackInProgress', ({ codeOfConductAgreed }) =>
    codeOfConductAgreed ? new CompletedForm() : new EmptyForm(),
  ),
  Match.tag('FeedbackReadyForPublishing', () => new CompletedForm()),
  Match.exhaustive,
)

const AgreeFieldSchema = Schema.Struct({ agree: Schema.Literal('yes') })
