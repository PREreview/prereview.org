import { Effect, Layer, pipe, Result } from 'effect'
import * as DatasetReviews from '../../../../../src/Domain/DatasetReviews/index.ts'
import * as _ from '../../../../../src/Domain/DatasetReviews/Workflows/PublishDatasetReview/UseZenodoRecordDoi.ts'
import { UnableToHandleCommand } from '../../../../../src/EventSourcing/Commands.ts'
import * as fc from '../../../../fc.ts'
import { describe, expect, it } from '../../../../vitest.ts'

describe('UseZenodoRecordDoi', () => {
  it.effect.prop('when the command can be completed', [fc.uuid(), fc.doi()], ([datasetReviewId, doi]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, doi), Effect.result)

      expect(actual).toStrictEqual(Result.void)
    }).pipe(Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => Effect.void }))),
  )

  it.effect.prop(
    "when the command can't be completed",
    [
      fc.uuid(),
      fc.doi(),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewAlreadyHasADoi({}),
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new UnableToHandleCommand({}),
      ),
    ],
    ([datasetReviewId, doi, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.UseZenodoRecordDoi(datasetReviewId, doi), Effect.result)

        expect(actual).toStrictEqual(Result.fail(new DatasetReviews.FailedToUseZenodoDoi({})))
      }).pipe(Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, { markDoiAsAssigned: () => error }))),
  )
})
