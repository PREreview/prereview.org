import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/DatasetReviews/Reactions/PublishRecordOnZenodo.js'
import * as Zenodo from '../../../src/Zenodo/index.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

describe('PublishRecordOnZenodo', () => {
  test.prop([fc.uuid(), fc.integer()])('when the command can be completed', (datasetReviewId, recordId) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            markRecordAsPublishedOnZenodo: () => Effect.void,
            markDoiAsActivated: () => Effect.void,
          }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(Zenodo.Zenodo, { publishRecord: () => Effect.void }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.integer(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.DatasetReviewHasNotBeenAssignedADoi({}),
      new DatasetReviews.NotAuthorizedToRunCommand({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])("when the activated-DOI command can't be completed", (datasetReviewId, recordId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            markRecordAsPublishedOnZenodo: () => Effect.void,
            markDoiAsActivated: () => error,
          }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(Zenodo.Zenodo, { publishRecord: () => Effect.void }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.integer(),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenStarted(),
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({}),
      new DatasetReviews.NotAuthorizedToRunCommand({}),
      new DatasetReviews.UnableToHandleCommand({}),
    ),
  ])("when the publish-record command can't be completed", (datasetReviewId, recordId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            markRecordAsPublishedOnZenodo: () => error,
            markDoiAsActivated: () => Effect.void,
          }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(Zenodo.Zenodo, { publishRecord: () => Effect.void }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([fc.uuid(), fc.integer()])("when the Zenodo record can't be published", (datasetReviewId, recordId) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(Zenodo.Zenodo, { publishRecord: () => new Zenodo.FailedToPublishRecord({}) }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.constantFrom(
      new DatasetReviews.UnknownDatasetReview({}),
      new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({}),
      new DatasetReviews.UnableToQuery({}),
    ),
  ])("when the Zenodo record ID can't be found", (datasetReviewId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => error }),
          Layer.mock(Zenodo.Zenodo, {}),
        ),
      ),
      EffectTest.run,
    ),
  )
})
