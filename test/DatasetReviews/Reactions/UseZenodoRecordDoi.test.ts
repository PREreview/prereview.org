import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/UseZenodoRecordDoi.js'
import * as Zenodo from '../../../src/Zenodo/index.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

describe('UseZenodoRecordDoi', () => {
  test.prop([fc.uuid(), fc.integer(), fc.doi()])(
    'when the command can be completed',
    (datasetReviewId, recordId, doi) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => Effect.void }),
            Layer.mock(Zenodo.Zenodo, { getDoiForDatasetReviewRecord: () => Effect.succeed(doi) }),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.uuid(),
    fc.integer(),
    fc.doi(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.DatasetReviewAlreadyHasADoi({}),
      new DatasetReviews.NotAuthorizedToRunCommand({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])("when the command can't be completed", (datasetReviewId, recordId, doi, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToUseZenodoDoi({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => error }),
          Layer.mock(Zenodo.Zenodo, { getDoiForDatasetReviewRecord: () => Effect.succeed(doi) }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([fc.uuid(), fc.integer()])("when the DOI can't be fetched", (datasetReviewId, recordId) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToUseZenodoDoi({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(Zenodo.Zenodo, {
            getDoiForDatasetReviewRecord: () => new Zenodo.FailedToGetRecordForDatasetReview({}),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
