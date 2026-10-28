import { Data, Match, Option } from 'effect'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export type UseOfAiForm = EmptyForm | CompletedForm

export type ValidForm = UseOfAiForm

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  generativeAiIdeas: 'yes' | 'no'
  generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromAnswer: (answer: DatasetReviews.UseOfAi) => ValidForm = Match.valueTags({
  AiWasUsed: ({ generativeAiIdeasDetails }) =>
    new CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails }),
  AiWasNotUsed: () => new CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
  NotAnswered: () => new EmptyForm(),
})
