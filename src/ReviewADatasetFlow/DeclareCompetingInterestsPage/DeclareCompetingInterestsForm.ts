import { Data, type Either, Option } from 'effect'
import type { NonEmptyString } from '../../types/index.js'

export type DeclareCompetingInterestsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  declareCompetingInterests: Either.Either<'yes', Missing>
  competingInterestsDetails: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  declareCompetingInterests: 'yes' | 'no'
  competingInterestsDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromCompetingInterests: (
  competingInterests: Option.Option<Option.Option<NonEmptyString.NonEmptyString>>,
) => DeclareCompetingInterestsForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: Option.match({
    onNone: () => new CompletedForm({ declareCompetingInterests: 'no', competingInterestsDetails: Option.none() }),
    onSome: competingInterests =>
      new CompletedForm({
        declareCompetingInterests: 'yes',
        competingInterestsDetails: Option.some(competingInterests),
      }),
  }),
})
