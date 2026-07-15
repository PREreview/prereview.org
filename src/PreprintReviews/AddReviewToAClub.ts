import { Effect, pipe } from 'effect'
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

export type Error = Errors.PreprintReviewNotFound | UnableToHandleCommand

export const AddReviewToAClub = (formStore: Keyv<unknown>): ((input: Input) => Effect.Effect<void, Error>) =>
  Effect.fn('PreprintReviews.addReviewToAClub')(function* (input) {
    if (!isClubId(input.clubId)) {
      return yield* new UnableToHandleCommand({ cause: 'not a club ID' })
    }

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

    yield* pipe(
      FptsToEffect.readerTaskEither(
        saveForm(input.orcidId, input.preprintId)(updateForm(form)({ club: input.clubId })),
        { formStore },
      ),
      Effect.catchAll(() => new UnableToHandleCommand({})),
    )
  })
