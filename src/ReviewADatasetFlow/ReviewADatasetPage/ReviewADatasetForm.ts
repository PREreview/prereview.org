import { Data, type Either } from 'effect'
import type { Doi } from '../../types/index.js'

export type ReviewADatasetForm = IncompleteForm | CompletedForm

export type IncompleteForm = EmptyForm | InvalidForm

export class Invalid extends Data.TaggedError('Invalid')<{
  value: string
}> {}

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  whichDataset: Either.Either<never, Invalid | Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  whichDataset: Doi.Doi
}> {}
