import { Data, type Either, Option } from 'effect'

export type ChooseYourPersonaForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  chooseYourPersona: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  chooseYourPersona: 'public' | 'pseudonym'
}> {}

export const fromPersona: (persona: Option.Option<'public' | 'pseudonym'>) => ChooseYourPersonaForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: persona => new CompletedForm({ chooseYourPersona: persona }),
})
