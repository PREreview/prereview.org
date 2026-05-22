import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type OthersNeedToBeListedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  othersNeedToBeListed: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  othersNeedToBeListed: 'no' | 'yes'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { othersNeedToBeListed } = yield* Schema.decode(OthersNeedToBeListedFieldSchema)(body)

    return new CompletedForm({ othersNeedToBeListed })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ othersNeedToBeListed: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'no' | 'yes'>) => OthersNeedToBeListedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ othersNeedToBeListed: answer }),
})

const OthersNeedToBeListedFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    othersNeedToBeListed: Schema.Literal('no', 'yes'),
  }),
)
