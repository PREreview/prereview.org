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
  function* (body: unknown) {
    const { chooseYourPersona } = yield* Schema.decodeUnknown(ChooseYourPersonaFieldSchema)(body)

    return new CompletedForm({ chooseYourPersona })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ chooseYourPersona: Either.left(new Missing()) })),
  ),
)

export const fromPersonaChoice: (personaChoice: Option.Option<'public' | 'pseudonym'>) => ChooseYourPersonaForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: persona => new CompletedForm({ chooseYourPersona: persona }),
  })

const ChooseYourPersonaFieldSchema = Schema.Struct({
  chooseYourPersona: Schema.Literal('public', 'pseudonym'),
})
