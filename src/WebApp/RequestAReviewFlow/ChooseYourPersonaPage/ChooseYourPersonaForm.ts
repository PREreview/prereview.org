import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, Schema } from 'effect'

export type ChooseYourPersonaForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  chooseYourPersona: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  chooseYourPersona: 'public' | 'pseudonym'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { chooseYourPersona } = yield* Schema.decodeEffect(ChooseYourPersonaFieldSchema)(body)

    return new CompletedForm({ chooseYourPersona })
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(new InvalidForm({ chooseYourPersona: Result.fail(new Missing()) })),
  ),
)

export const fromPersonaChoice: (personaChoice: Option.Option<'public' | 'pseudonym'>) => ChooseYourPersonaForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: personaChoice => new CompletedForm({ chooseYourPersona: personaChoice }),
  })

const ChooseYourPersonaFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      chooseYourPersona: Schema.Literals(['public', 'pseudonym']),
    }),
  ),
)
