import { Effect, pipe, type Result } from 'effect'
import type { PreprintId } from '../Preprints/index.ts'
import { UnableToQuery } from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import { getForm, type LegacyFormStore } from './legacy-form.ts'
import { NextExpectedCommand } from './NextExpectedCommand.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Result = Result.Result<NextExpectedCommand, Errors.PreprintReviewNotFound | UnableToQuery>

export const GetNextExpectedCommand = (
  formStore: LegacyFormStore,
): ((input: Input) => Effect.Effect<Result.Result.Success<Result>, Result.Result.Failure<Result>>) =>
  Effect.fn('PreprintReviews.getNextExpectedCommand')(function* (input) {
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

    return NextExpectedCommand(form)
  })
