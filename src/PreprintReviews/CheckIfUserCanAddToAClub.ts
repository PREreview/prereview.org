import { Effect, Option, pipe, type Either } from 'effect'
import type { ClubId } from '../Clubs/index.ts'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { UnableToQuery } from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { getForm } from '../WebApp/write-review/form.ts' // eslint-disable-line import/no-internal-modules
import * as Errors from './Errors.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Result = Either.Either<Option.Option<ClubId | null>, Errors.PreprintReviewNotFound | UnableToQuery>

export const CheckIfUserCanAddToAClub = (
  formStore: Keyv<unknown>,
): ((input: Input) => Effect.Effect<Either.Either.Right<Result>, Either.Either.Left<Result>>) =>
  Effect.fn('PreprintReviews.checkIfUserCanAddToAClub')(function* (input) {
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

    if (form.club === undefined) {
      return Option.none()
    }

    return Option.some(form.club)
  })
