import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/MarkDatasetReviewAsPublished.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('MarkDatasetReviewAsPublished', () => {
  test.prop([fc.uuid()])('when the command can be completed', datasetReviewId =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewCommands, { markDatasetReviewAsPublished: () => Effect.void }),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.PublicationOfDatasetReviewWasNotRequested(),
      new DatasetReviews.DatasetReviewNotReadyToBeMarkedAsPublished({ missing: ['DatasetReviewWasAssignedADoi'] }),
      new DatasetReviews.NotAuthorizedToRunCommand({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])("when the command can't be completed", (datasetReviewId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.MarkDatasetReviewAsPublished(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToMarkDatasetReviewAsPublished({})))
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { markDatasetReviewAsPublished: () => error })),
      EffectTest.run,
    ),
  )
})
