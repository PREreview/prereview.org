import type { UrlParams } from 'effect/http'
import { Boolean, Data, Effect, Result, Schema } from 'effect'

export type DeclareFollowingCodeOfConductForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followingCodeOfConduct: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followingCodeOfConduct: 'yes'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { followingCodeOfConduct } = yield* Schema.decodeEffect(FollowingCodeOfConductFieldSchema)(body)

    return new CompletedForm({ followingCodeOfConduct })
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(new InvalidForm({ followingCodeOfConduct: Result.fail(new Missing()) })),
  ),
)

export const fromHasBeenDeclared: (hasBeenDeclared: boolean) => DeclareFollowingCodeOfConductForm = Boolean.match({
  onFalse: () => new EmptyForm(),
  onTrue: () => new CompletedForm({ followingCodeOfConduct: 'yes' }),
})

const FollowingCodeOfConductFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      followingCodeOfConduct: Schema.Literal('yes'),
    }),
  ),
)
