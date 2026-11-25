import { Effect, pipe } from 'effect'
import { Commands } from '../../EventSourcing/index.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { PreprintId } from '../Preprints/index.ts'
import * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { loadForm, storeForm, updateForm, type FormStorage } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Error = Errors.PreprintReviewNotFound | Commands.UnableToHandleCommand

export const MarkReviewAsNotInAClub = (formStore: FormStorage): ((input: Input) => Effect.Effect<void, Error>) =>
  Effect.fn('PreprintReviews.markReviewAsNotInAClub')(function* (input) {
    const form = yield* pipe(
      loadForm(input.orcidId, input.preprintId),
      Effect.provideService(FormStore.Store, formStore),
      Effect.catchIf(
        error => error === 'no-form',
        () => new Errors.PreprintReviewNotFound({}),
      ),
      Effect.catchIf(
        error => error === 'form-unavailable',
        () => new Commands.UnableToHandleCommand({}),
      ),
    )

    if (form.club === null) {
      return
    }

    yield* pipe(
      storeForm(input.orcidId, input.preprintId, updateForm(form)({ club: null })),
      Effect.provideService(FormStore.Store, formStore),
      Effect.catch(() => new Commands.UnableToHandleCommand({})),
    )
  })
