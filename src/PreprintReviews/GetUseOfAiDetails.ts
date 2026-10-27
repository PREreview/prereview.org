import { Effect, Option, pipe, type Either } from 'effect'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { UnableToQuery } from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import { getForm, type Form } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export interface UseOfAiDetails {
  generativeAiIdeas: Option.Option<'yes' | 'no'>
  generativeAiIdeasDetails: Option.Option<NonEmptyString>
  moreAuthors: Form['moreAuthors']
  alreadyWritten: Form['alreadyWritten']
}

export type Result = Either.Either<UseOfAiDetails, Errors.PreprintReviewNotFound | UnableToQuery>

export const GetUseOfAiDetails = (
  formStore: Keyv<unknown>,
): ((input: Input) => Effect.Effect<Either.Either.Right<Result>, Either.Either.Left<Result>>) =>
  Effect.fn('PreprintReviews.getUseOfAiDetails')(function* (input) {
    const form = yield* pipe(
      FptsToEffect.readerTaskEither(getForm(input.orcidId, input.preprintId), { formStore }),
      Effect.catchIf(
        error => error === 'no-form',
        () => new Errors.PreprintReviewNotFound({}),
      ),
      Effect.catchIf(
        error => error === 'form-unavailable',
        () => new UnableToQuery({}),
      ),
    )

    return {
      generativeAiIdeas: Option.fromNullable(form.generativeAiIdeas),
      generativeAiIdeasDetails:
        form.generativeAiIdeas === 'yes' ? Option.fromNullable(form.generativeAiIdeasDetails) : Option.none(),
      moreAuthors: form.moreAuthors,
      alreadyWritten: form.alreadyWritten,
    }
  })
