import { Effect, Option, pipe } from 'effect'
import { UnableToHandleCommand } from '../Commands.ts'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import { getForm, saveForm, updateForm } from './legacy-form.ts'

export type Input = {
  preprintId: PreprintId
  orcidId: OrcidId
} & (
  { generativeAiIdeas: 'yes'; generativeAiIdeasDetails: Option.Option<NonEmptyString> } | { generativeAiIdeas: 'no' }
)

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

    const generativeAiIdeasDetails =
      input.generativeAiIdeas === 'yes' ? Option.getOrUndefined(input.generativeAiIdeasDetails) : undefined

    if (
      form.generativeAiIdeas === input.generativeAiIdeas &&
      form.generativeAiIdeasDetails === generativeAiIdeasDetails
    ) {
      return
    }

    const updatedForm = updateForm(form)({ generativeAiIdeas: input.generativeAiIdeas, generativeAiIdeasDetails })

    yield* pipe(
      FptsToEffect.readerTaskEither(saveForm(input.orcidId, input.preprintId)(updatedForm), { formStore }),
      Effect.catchAll(() => new UnableToHandleCommand({})),
    )
  })
