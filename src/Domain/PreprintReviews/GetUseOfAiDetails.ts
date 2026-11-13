import { Effect, Option, pipe, type Result } from 'effect'
import type { PreprintId } from '../../Preprints/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { loadForm, type Form, type FormStorage } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type UseOfAiDetails = {
  moreAuthors: Form['moreAuthors']
  alreadyWritten: Form['alreadyWritten']
} & (
  | { _tag: 'AiWasUsed'; generativeAiIdeasDetails: Option.Option<NonEmptyString> }
  | { _tag: 'AiWasNotUsed' }
  | { _tag: 'NotAnswered' }
)

export type Result = Result.Result<UseOfAiDetails, Errors.PreprintReviewNotFound | UnableToQuery>

export const GetUseOfAiDetails = (
  formStore: FormStorage,
): ((input: Input) => Effect.Effect<Result.Result.Success<Result>, Result.Result.Failure<Result>>) =>
  Effect.fn('PreprintReviews.getUseOfAiDetails')(function* (input) {
    const form = yield* pipe(
      loadForm(input.orcidId, input.preprintId),
      Effect.provideService(FormStore.Store, formStore),
      Effect.catchIf(
        error => error === 'no-form',
        () => new Errors.PreprintReviewNotFound({}),
      ),
      Effect.catchIf(
        error => error === 'form-unavailable',
        () => new UnableToQuery({}),
      ),
    )

    const authors = { moreAuthors: form.moreAuthors, alreadyWritten: form.alreadyWritten }

    if (form.generativeAiIdeas === 'yes') {
      return {
        _tag: 'AiWasUsed',
        generativeAiIdeasDetails: Option.fromNullishOr(form.generativeAiIdeasDetails),
        ...authors,
      }
    }

    if (form.generativeAiIdeas === 'no') {
      return { _tag: 'AiWasNotUsed', ...authors }
    }

    return { _tag: 'NotAnswered', ...authors }
  })
