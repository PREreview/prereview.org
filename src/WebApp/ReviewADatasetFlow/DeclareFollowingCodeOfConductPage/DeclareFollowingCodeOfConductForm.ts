import { UrlParams } from '@effect/platform'
import { Boolean, Data, Effect, Either, Schema } from 'effect'

export type DeclareFollowingCodeOfConductForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followingCodeOfConduct: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followingCodeOfConduct: 'yes'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { followingCodeOfConduct } = yield* Schema.decode(FollowingCodeOfConductFieldSchema)(body)

    return new CompletedForm({ followingCodeOfConduct })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ followingCodeOfConduct: Either.left(new Missing()) })),
  ),
)

export const fromHasBeenDeclared: (hasBeenDeclared: boolean) => DeclareFollowingCodeOfConductForm = Boolean.match({
  onFalse: () => new EmptyForm(),
  onTrue: () => new CompletedForm({ followingCodeOfConduct: 'yes' }),
})

const FollowingCodeOfConductFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followingCodeOfConduct: Schema.Literal('yes'),
  }),
)
