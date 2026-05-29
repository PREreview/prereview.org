import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type ChooseYourPersonaForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  chooseYourPersona: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  chooseYourPersona: 'public' | 'pseudonym'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { chooseYourPersona } = yield* Schema.decode(ChooseYourPersonaFieldSchema)(body)

    return new CompletedForm({ chooseYourPersona })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ chooseYourPersona: Either.left(new Missing()) })),
  ),
)

export const fromPersona: (persona: Option.Option<'public' | 'pseudonym'>) => ChooseYourPersonaForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: persona => new CompletedForm({ chooseYourPersona: persona }),
})

const ChooseYourPersonaFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    chooseYourPersona: Schema.Literal('public', 'pseudonym'),
  }),
)
