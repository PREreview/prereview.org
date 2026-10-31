import { describe, expect, it } from '../../vitest.ts'
import { Effect, Result, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Workflows/MarkDatasetReviewAsPublished.ts'
import * as fc from '../../fc.ts'

describe('MarkDatasetReviewAsPublished', () => {
  it.effect.prop('when the command can be completed', [fc.uuid()], ([datasetReviewId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.result)

      expect(actual).toStrictEqual(Result.void)
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
        const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.result)

        expect(actual).toStrictEqual(Result.fail(new DatasetReviews.FailedToMarkDatasetReviewAsPublished({})))
      }).pipe(
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { markDatasetReviewAsPublished: () => error })),
      ),
  )
})
