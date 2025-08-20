import { Data, type Either } from 'effect'

export type HasEnoughMetadataForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasEnoughMetadata: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasEnoughMetadata: 'yes' | 'partly' | 'no' | 'unsure'
}> {}
