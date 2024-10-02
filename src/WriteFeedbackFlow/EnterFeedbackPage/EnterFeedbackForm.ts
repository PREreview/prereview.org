import { Schema } from '@effect/schema'
import { Data, Effect, Either, Match, pipe } from 'effect'
import markdownIt from 'markdown-it'
import type * as Feedback from '../../Feedback/index.js'
import { type Html, sanitizeHtml } from '../../html.js'
import { NonEmptyString } from '../../types/index.js'

export type EnterFeedbackForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  feedback: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  feedback: Html
}> {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const { feedback } = yield* Schema.decodeUnknown(FeedbackFieldSchema)(body)

    return new CompletedForm({ feedback })
  }).pipe(
    Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ feedback: Either.left(new Missing()) }))),
  )

export const fromFeedback = pipe(
  Match.type<Feedback.FeedbackInProgress | Feedback.FeedbackReadyForPublishing>(),
  Match.tag('FeedbackInProgress', ({ feedback }) => (feedback ? new CompletedForm({ feedback }) : new EmptyForm())),
  Match.tag('FeedbackReadyForPublishing', ({ feedback }) => new CompletedForm({ feedback })),
  Match.exhaustive,
)

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.Any, {
  strict: true,
  decode: string => sanitizeHtml(markdownIt({ html: true }).render(string)),
  encode: String,
})

const FeedbackFieldSchema = Schema.Struct({ feedback: Schema.compose(NonEmptyString.NonEmptyStringSchema, HtmlSchema) })
