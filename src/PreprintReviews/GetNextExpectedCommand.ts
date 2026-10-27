import { Effect, pipe, type Either } from 'effect'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import { UnableToQuery } from '../Queries.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import * as Errors from './Errors.ts'
import { getForm } from './legacy-form.ts'
import { NextExpectedCommand } from './NextExpectedCommand.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Result = Either.Either<NextExpectedCommand, Errors.PreprintReviewNotFound | UnableToQuery>

export const GetNextExpectedCommand = (
  formStore: Keyv<unknown>,
): ((input: Input) => Effect.Effect<Either.Either.Right<Result>, Either.Either.Left<Result>>) =>
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
