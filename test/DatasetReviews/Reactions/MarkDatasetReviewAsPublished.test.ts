import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/MarkDatasetReviewAsPublished.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

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
