import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/PublishRecordOnZenodo.ts'
import { ZenodoRecords } from '../../../src/ExternalInteractions/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as fc from '../../fc.ts'

describe('PublishRecordOnZenodo', () => {
  it.effect.prop('when the command can be completed', [fc.uuid(), fc.integer()], ([datasetReviewId, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide([
        Layer.mock(DatasetReviews.DatasetReviewCommands, {
          markRecordAsPublishedOnZenodo: () => Effect.void,
          markDoiAsActivated: () => Effect.void,
        }),
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
        Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecord: () => Effect.void }),
      ]),
    ),
  )

  it.effect.prop(
    "when the activated-DOI command can't be completed",
    [
      fc.uuid(),
      fc.integer(),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        new DatasetReviews.DatasetReviewHasNotBeenAssignedADoi({}),
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
      ),
    ],
    ([datasetReviewId, recordId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            markRecordAsPublishedOnZenodo: () => Effect.void,
            markDoiAsActivated: () => error,
          }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecord: () => Effect.void }),
        ]),
      ),
  )

  it.effect.prop(
    "when the publish-record command can't be completed",
    [
      fc.uuid(),
      fc.integer(),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({}),
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
      ),
    ],
    ([datasetReviewId, recordId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            markRecordAsPublishedOnZenodo: () => error,
            markDoiAsActivated: () => Effect.void,
          }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecord: () => Effect.void }),
        ]),
      ),
  )

  it.effect.prop(
    "when the Zenodo record can't be published",
    [fc.uuid(), fc.integer()],
    ([datasetReviewId, recordId]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => Effect.succeed(recordId) }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { publishRecord: () => new ZenodoRecords.FailedToPublishRecord({}) }),
        ]),
      ),
  )

  it.effect.prop(
    "when the Zenodo record ID can't be found",
    [
      fc.uuid(),
      fc.constantFrom(
        new DatasetReviews.UnknownDatasetReview({}),
        new DatasetReviews.DatasetReviewDoesNotHaveAZenodoRecord({}),
        new Queries.UnableToQuery({}),
      ),
    ],
    ([datasetReviewId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.PublishRecordOnZenodo(datasetReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToPublishRecordOnZenodo({})))
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getZenodoRecordId: () => error }),
          Layer.mock(ZenodoRecords.ZenodoRecords, {}),
        ]),
      ),
  )
})
