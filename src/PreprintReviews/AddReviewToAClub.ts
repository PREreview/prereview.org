import { Array, Effect, pipe } from 'effect'
import { isClubId } from '../Clubs/index.ts'
import { UnableToHandleCommand } from '../Commands.ts'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { getForm, saveForm, updateForm } from '../WebApp/write-review/form.ts' // eslint-disable-line import/no-internal-modules
import * as Errors from './Errors.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
  clubId: Uuid
}

export type Error = Errors.PreprintReviewNotFound | Errors.UnknownClub | UnableToHandleCommand

export const AddReviewToAClub = (
  formStore: Keyv<unknown>,
  clubs: ReadonlyArray<Uuid>,
): ((input: Input) => Effect.Effect<void, Error>) =>
  Effect.fn('PreprintReviews.addReviewToAClub')(function* (input) {
    const form = yield* pipe(
      FptsToEffect.readerTaskEither(getForm(input.orcidId, input.preprintId), { formStore }),
      Effect.catchIf(
        error => error === 'no-form',
        () => new Errors.PreprintReviewNotFound({}),
      ),
      Effect.catchIf(
        error => error === 'form-unavailable',
        () => new UnableToHandleCommand({}),
      ),
    )

    if (form.club === input.clubId) {
      return
    }

    if (!isClubId(input.clubId) || !Array.contains(clubs, input.clubId)) {
      return yield* new Errors.UnknownClub()
    }

    yield* pipe(
      FptsToEffect.readerTaskEither(
        saveForm(input.orcidId, input.preprintId)(updateForm(form)({ club: input.clubId })),
        { formStore },
      ),
      Effect.catchAll(() => new UnableToHandleCommand({})),
    )
  })
