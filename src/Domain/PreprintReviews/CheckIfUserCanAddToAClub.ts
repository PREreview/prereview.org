import { Effect, Option, pipe, type Result } from 'effect'
import type { PreprintId } from '../Preprints/index.ts'
import { UnableToQuery } from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'
import * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { loadForm, type FormStorage } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Result = Result.Result<Option.Option<Uuid | null>, Errors.PreprintReviewNotFound | UnableToQuery>

export const CheckIfUserCanAddToAClub = (
  formStore: FormStorage,
): ((input: Input) => Effect.Effect<Result.Result.Success<Result>, Result.Result.Failure<Result>>) =>
  Effect.fn('PreprintReviews.checkIfUserCanAddToAClub')(function* (input) {
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

    if (form.club === undefined) {
      return Option.none()
    }

    return Option.some(form.club)
  })
