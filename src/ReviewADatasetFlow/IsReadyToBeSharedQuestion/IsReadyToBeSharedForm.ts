import { Data, type Either, Option } from 'effect'

export type IsReadyToBeSharedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isReadyToBeShared: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isReadyToBeShared: 'yes' | 'no' | 'unsure'
}> {}

export const fromAnswer: (answer: Option.Option<'yes' | 'no' | 'unsure'>) => IsReadyToBeSharedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isReadyToBeShared: answer }),
})
