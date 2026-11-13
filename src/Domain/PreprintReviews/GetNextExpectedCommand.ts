import { Effect, pipe, type Result } from 'effect'
import type { PreprintId } from '../../Preprints/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { loadForm, type FormStorage } from './legacy-form.ts'
import { NextExpectedCommand } from './NextExpectedCommand.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Result = Result.Result<NextExpectedCommand, Errors.PreprintReviewNotFound | UnableToQuery>

export const GetNextExpectedCommand = (
  formStore: FormStorage,
): ((input: Input) => Effect.Effect<Result.Result.Success<Result>, Result.Result.Failure<Result>>) =>
  Effect.fn('PreprintReviews.getNextExpectedCommand')(function* (input) {
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

    return NextExpectedCommand(form)
  })
