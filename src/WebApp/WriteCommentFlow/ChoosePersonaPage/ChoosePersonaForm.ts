import { Data, Effect, Either, Match, pipe, Schema } from 'effect'
import type * as Comments from '../../../Comments/index.ts'

export type ChoosePersonaForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  persona: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  persona: 'public' | 'pseudonym'
}> {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const { persona } = yield* Schema.decodeUnknown(PersonaFieldSchema)(body)

    return new CompletedForm({ persona })
  }).pipe(Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ persona: Either.left(new Missing()) }))))

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ persona }) => (persona ? new CompletedForm({ persona }) : new EmptyForm())),
  Match.tag('CommentReadyForPublishing', ({ persona }) => new CompletedForm({ persona })),
  Match.exhaustive,
)

const PersonaFieldSchema = Schema.Struct({ persona: Schema.Literal('public', 'pseudonym') })
