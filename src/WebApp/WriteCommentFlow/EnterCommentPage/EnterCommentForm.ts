import { Data, Effect, Either, Match, pipe, Schema } from 'effect'
import markdownIt from 'markdown-it'
import type * as Comments from '../../../Comments/index.ts'
import { Html, sanitizeHtml } from '../../../html.ts'
import { NonEmptyString } from '../../../types/index.ts'

export type EnterCommentForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  comment: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  comment: Html
}> {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const { comment } = yield* Schema.decodeUnknown(CommentFieldSchema)(body)

    return new CompletedForm({ comment })
  }).pipe(Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ comment: Either.left(new Missing()) }))))

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ comment }) => (comment ? new CompletedForm({ comment }) : new EmptyForm())),
  Match.tag('CommentReadyForPublishing', ({ comment }) => new CompletedForm({ comment })),
  Match.exhaustive,
)

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(markdownIt({ html: true }).render(string)),
  encode: String,
})

const CommentFieldSchema = Schema.Struct({ comment: Schema.compose(NonEmptyString.NonEmptyStringSchema, HtmlSchema) })
