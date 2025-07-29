import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe, Struct } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/CreateRecordOnZenodo.js'
import * as Zenodo from '../../../src/Zenodo/index.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

describe('CreateRecordOnZenodo', () => {
  test.prop([
    fc.uuid(),
    fc.record({
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.get('answer')),
    }),
    fc.integer(),
  ])('when the command can be completed', (datasetReviewId, preview, recordId) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, { markRecordCreatedOnZenodo: () => Effect.void }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getDataForZenodoRecord: () => Effect.succeed(preview),
          }),
          Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.record({
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.get('answer')),
    }),
    fc.integer(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.DatasetReviewAlreadyHasAZenodoRecord({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])("when the command can't be completed", (datasetReviewId, preview, recordId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, { markRecordCreatedOnZenodo: () => error }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getDataForZenodoRecord: () => Effect.succeed(preview),
          }),
          Layer.mock(Zenodo.Zenodo, { createRecordForDatasetReview: () => Effect.succeed(recordId) }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.record({
      answerToIfTheDatasetFollowsFairAndCarePrinciples: fc
        .datasetReviewAnsweredIfTheDatasetFollowsFairAndCarePrinciples()
        .map(Struct.get('answer')),
    }),
  ])("when the record can't be created", (datasetReviewId, preview) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getDataForZenodoRecord: () => Effect.succeed(preview),
          }),
          Layer.mock(Zenodo.Zenodo, {
            createRecordForDatasetReview: () => new Zenodo.FailedToCreateRecordForDatasetReview({}),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.constantFrom(
      new DatasetReviews.UnknownDatasetReview({}),
      new DatasetReviews.DatasetReviewIsInProgress(),
      new DatasetReviews.DatasetReviewHasBeenPublished(),
      new DatasetReviews.UnableToQuery({}),
    ),
  ])("when the data can't be generated", (datasetReviewId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CreateRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToCreateRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getDataForZenodoRecord: () => error }),
          Layer.mock(Zenodo.Zenodo, {}),
        ),
      ),
      EffectTest.run,
    ),
  )
})
