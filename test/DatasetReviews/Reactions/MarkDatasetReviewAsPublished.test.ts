import { it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import { describe, expect } from 'vitest'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/MarkDatasetReviewAsPublished.ts'
import * as fc from '../../fc.ts'

describe('MarkDatasetReviewAsPublished', () => {
  it.effect.prop('when the command can be completed', [fc.uuid()], ([datasetReviewId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewCommands, { markDatasetReviewAsPublished: () => Effect.void }),
      ),
    ),
  )

  it.effect.prop(
    "when the command can't be completed",
    [
      fc.uuid(),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.PublicationOfDatasetReviewWasNotRequested(),
        new DatasetReviews.DatasetReviewNotReadyToBeMarkedAsPublished({ missing: ['DatasetReviewWasAssignedADoi'] }),
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
      ),
    ],
    ([datasetReviewId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToMarkDatasetReviewAsPublished({})))
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { markDatasetReviewAsPublished: () => error })),
      ),
  )
})
