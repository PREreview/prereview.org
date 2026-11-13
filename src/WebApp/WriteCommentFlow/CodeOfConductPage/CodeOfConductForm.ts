import { Data, Effect, Result, Match, pipe, Schema } from 'effect'
import type * as Comments from '../../../Domain/Comments/index.ts'

export type CodeOfConductForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  agree: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm') {}

export const fromBody = Effect.fnUntraced(
  function* (body: unknown) {
    yield* Schema.decodeUnknownEffect(AgreeFieldSchema)(body)

    return new CompletedForm()
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm({ agree: Result.fail(new Missing()) }))),
)

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ codeOfConductAgreed }) =>
    codeOfConductAgreed ? new CompletedForm() : new EmptyForm(),
  ),
  Match.tag('CommentReadyForPublishing', () => new CompletedForm()),
  Match.exhaustive,
)

const AgreeFieldSchema = Schema.Struct({ agree: Schema.Literal('yes') })
