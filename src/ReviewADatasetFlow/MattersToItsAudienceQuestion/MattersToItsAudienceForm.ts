import { Data, type Either, Option } from 'effect'

export type MattersToItsAudienceForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  mattersToItsAudience: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  mattersToItsAudience: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
}> {}

export const fromAnswer: (
  answer: Option.Option<'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'>,
) => MattersToItsAudienceForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ mattersToItsAudience: answer }),
})
