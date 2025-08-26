import { Data, type Either } from 'effect'

export type HasTrackedChangesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasTrackedChanges: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasTrackedChanges: 'yes' | 'partly' | 'no' | 'unsure'
}> {}
