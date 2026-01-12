import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Inbox from '../../../src/WebApp/Inbox/index.ts'
import * as _ from '../../../src/WebApp/Inbox/ProcessCoarNotifyMessage.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('ProcessCoarNotifyMessage', () => {
  test.prop([fc.coarNotifyRequestReview(), fc.uuid(), fc.instant(), fc.preprintId()])(
    'when the command can be completed',
    (message, messageId, receivedAt, preprintId) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              receiveReviewRequest: () => Effect.void,
              acceptReviewRequest: () => Effect.void,
            }),
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprintId) }),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.coarNotifyRequestReview(),
    fc.uuid(),
    fc.instant(),
    fc.preprintId(),
    fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
  ])("when the command can't be completed", (message, messageId, receivedAt, preprintId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

      expect(actual).toStrictEqual(Either.left(new Inbox.FailedToProcessRequestReview({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(ReviewRequests.ReviewRequestCommands, {
            receiveReviewRequest: () => error,
            acceptReviewRequest: () => error,
          }),
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprintId) }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.coarNotifyRequestReview(),
    fc.uuid(),
    fc.instant(),
    fc.anything().map(cause => new Preprints.NotAPreprint({ cause })),
  ])('when it is not a preprint', (message, messageId, receivedAt, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

      expect(actual).toStrictEqual(Either.left(new Inbox.RejectedRequestReview({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.coarNotifyRequestReview(),
    fc.uuid(),
    fc.instant(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
      ),
  ])('when the preprint ID cannot be resolved', (message, messageId, receivedAt, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

      expect(actual).toStrictEqual(Either.left(new Inbox.FailedToProcessRequestReview({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([fc.coarNotifyRequestReview({ objectCiteAs: fc.nonPreprintDoi() }), fc.uuid(), fc.instant()])(
    'when the DOI is not for a preprint',
    (message, messageId, receivedAt) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

        expect(actual).toStrictEqual(Either.left(new Inbox.RejectedRequestReview()))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(Layer.mock(ReviewRequests.ReviewRequestCommands, {}), Layer.mock(Preprints.Preprints, {})),
        ),
        EffectTest.run,
      ),
  )
})
