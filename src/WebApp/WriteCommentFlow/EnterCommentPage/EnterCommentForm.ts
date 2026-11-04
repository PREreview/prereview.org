import { Data, Effect, Result, Match, pipe, Schema, SchemaTransformation } from 'effect'
import markdownIt from 'markdown-it'
import type * as Comments from '../../../Comments/index.ts'
import { type Html, SanitizeHtmlSchema } from '../../../html.ts'
import { NonEmptyString } from '../../../types/index.ts'

export type EnterCommentForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  comment: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  comment: Html
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: unknown) {
    const { comment } = yield* Schema.decodeUnknownEffect(CommentFieldSchema)(body)

    return new CompletedForm({ comment })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm({ comment: Result.fail(new Missing()) }))),
)

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ comment }) => (comment ? new CompletedForm({ comment }) : new EmptyForm())),
  Match.tag('CommentReadyForPublishing', ({ comment }) => new CompletedForm({ comment })),
  Match.exhaustive,
)

const HtmlSchema: Schema.Codec<Html, string> = Schema.String.pipe(
  Schema.decodeTo(
    SanitizeHtmlSchema(),
    SchemaTransformation.transform({ decode: string => markdownIt({ html: true }).render(string), encode: String }),
  ),
)

const CommentFieldSchema = Schema.Struct({
  comment: NonEmptyString.NonEmptyStringSchema.pipe(Schema.decodeTo(HtmlSchema)),
})
