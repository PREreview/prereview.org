import { Data, type Either, Option } from 'effect'

export type RateTheQualityForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  qualityRating: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  qualityRating: 'excellent' | 'fair' | 'poor' | 'unsure'
}> {}

export const fromAnswer: (answer: Option.Option<'excellent' | 'fair' | 'poor' | 'unsure'>) => RateTheQualityForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: answer => new CompletedForm({ qualityRating: answer }),
  })
