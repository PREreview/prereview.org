import { Data, Effect, Either, Match, pipe, Schema } from 'effect'
import type * as Comments from '../../Comments/index.ts'

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

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ codeOfConductAgreed }) =>
    codeOfConductAgreed ? new CompletedForm() : new EmptyForm(),
  ),
  Match.tag('CommentReadyForPublishing', () => new CompletedForm()),
  Match.exhaustive,
)

const AgreeFieldSchema = Schema.Struct({ agree: Schema.Literal('yes') })
