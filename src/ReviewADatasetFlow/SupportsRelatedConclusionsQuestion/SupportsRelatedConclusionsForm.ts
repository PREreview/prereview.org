import { Data, type Either, Option } from 'effect'

export type SupportsRelatedConclusionsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  supportsRelatedConclusions: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  supportsRelatedConclusions: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromAnswer: (answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>) => SupportsRelatedConclusionsForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: answer => new CompletedForm({ supportsRelatedConclusions: answer }),
  })
