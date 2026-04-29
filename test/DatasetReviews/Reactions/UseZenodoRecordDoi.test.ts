import { it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import { describe, expect } from 'vitest'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Reactions/UseZenodoRecordDoi.ts'
import { ZenodoRecords } from '../../../src/ExternalInteractions/index.ts'
import * as fc from '../../fc.ts'

describe('UseZenodoRecordDoi', () => {
  it.effect.prop(
    'when the command can be completed',
    [fc.uuid(), fc.integer(), fc.doi()],
    ([datasetReviewId, recordId, doi]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => Effect.void }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { getDoiForDatasetReviewRecord: () => Effect.succeed(doi) }),
        ]),
      ),
  )

  it.effect.prop(
    "when the command can't be completed",
    [
      fc.uuid(),
      fc.integer(),
      fc.doi(),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewAlreadyHasADoi({}),
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
      ),
    ],
    ([datasetReviewId, recordId, doi, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToUseZenodoDoi({})))
      }).pipe(
        Effect.provide([
          Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => error }),
          Layer.mock(ZenodoRecords.ZenodoRecords, { getDoiForDatasetReviewRecord: () => Effect.succeed(doi) }),
        ]),
      ),
  )

  it.effect.prop("when the DOI can't be fetched", [fc.uuid(), fc.integer()], ([datasetReviewId, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, recordId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new DatasetReviews.FailedToUseZenodoDoi({})))
    }).pipe(
      Effect.provide([
        Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
        Layer.mock(ZenodoRecords.ZenodoRecords, {
          getDoiForDatasetReviewRecord: () => new ZenodoRecords.FailedToGetRecordForDatasetReview({}),
        }),
      ]),
    ),
  )
})
