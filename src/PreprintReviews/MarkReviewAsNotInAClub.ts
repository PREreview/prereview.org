import { Context, Effect, pipe } from 'effect'
import { UnableToHandleCommand } from '../Commands.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { getForm, saveForm, updateForm, type FormStorage } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Error = Errors.PreprintReviewNotFound | UnableToHandleCommand

export const MarkReviewAsNotInAClub = (formStore: FormStorage): ((input: Input) => Effect.Effect<void, Error>) =>
  Effect.fn('PreprintReviews.markReviewAsNotInAClub')(function* (input) {
    const form = yield* pipe(
      FptsToEffect.readerTaskEither(getForm(input.orcidId, input.preprintId), {
        runtime: Context.make(FormStore.Store, formStore),
      }),
      Effect.catchIf(
        error => error === 'no-form',
        () => new Errors.PreprintReviewNotFound({}),
      ),
      Effect.catchIf(
        error => error === 'form-unavailable',
        () => new UnableToHandleCommand({}),
      ),
    )

    if (form.club === null) {
      return
    }

    yield* pipe(
      FptsToEffect.readerTaskEither(saveForm(input.orcidId, input.preprintId)(updateForm(form)({ club: null })), {
        runtime: Context.make(FormStore.Store, formStore),
      }),
      Effect.catch(() => new UnableToHandleCommand({})),
    )
  })
