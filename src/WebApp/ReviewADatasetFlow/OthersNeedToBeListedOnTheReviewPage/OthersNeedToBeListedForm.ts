import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, Schema } from 'effect'

export type OthersNeedToBeListedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  othersNeedToBeListed: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  othersNeedToBeListed: 'no' | 'yes'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { othersNeedToBeListed } = yield* Schema.decodeEffect(OthersNeedToBeListedFieldSchema)(body)

    return new CompletedForm({ othersNeedToBeListed })
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(new InvalidForm({ othersNeedToBeListed: Result.fail(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'no' | 'yes'>) => OthersNeedToBeListedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ othersNeedToBeListed: answer }),
})

const OthersNeedToBeListedFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      othersNeedToBeListed: Schema.Literals(['no', 'yes']),
    }),
  ),
)
