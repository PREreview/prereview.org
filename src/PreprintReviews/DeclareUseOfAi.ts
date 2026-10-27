import { Effect, pipe } from 'effect'
import { UnableToHandleCommand } from '../Commands.ts'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import { getForm, saveForm, updateForm } from './legacy-form.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
  generativeAiIdeas: 'yes' | 'no'
}

export type Error = Errors.PreprintReviewNotFound | UnableToHandleCommand

export const DeclareUseOfAi = (formStore: Keyv<unknown>): ((input: Input) => Effect.Effect<void, Error>) =>
  Effect.fn('PreprintReviews.declareUseOfAi')(function* (input) {
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

    if (form.generativeAiIdeas === input.generativeAiIdeas) {
      return
    }

    yield* pipe(
      FptsToEffect.readerTaskEither(
        saveForm(input.orcidId, input.preprintId)(updateForm(form)({ generativeAiIdeas: input.generativeAiIdeas })),
        { formStore },
      ),
      Effect.catchAll(() => new UnableToHandleCommand({})),
    )
  })
