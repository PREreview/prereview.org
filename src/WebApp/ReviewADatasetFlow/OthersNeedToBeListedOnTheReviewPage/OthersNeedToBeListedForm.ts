import { Data, type Either, Option } from 'effect'

export type OthersNeedToBeListedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  othersNeedToBeListed: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  othersNeedToBeListed: 'no' | 'yes'
}> {}

export const fromAnswer: (answer: Option.Option<'no' | 'yes'>) => OthersNeedToBeListedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ othersNeedToBeListed: answer }),
})
