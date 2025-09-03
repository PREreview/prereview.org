import { Data, type Either, Option } from 'effect'

export type IsErrorFreeForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isErrorFree: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isErrorFree: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromAnswer: (answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>) => IsErrorFreeForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isErrorFree: answer }),
})
