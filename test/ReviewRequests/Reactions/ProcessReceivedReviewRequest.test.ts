import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, Layer, pipe, TestClock } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/ProcessReceivedReviewRequest.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('ProcessReceivedReviewRequest', () => {
  describe('when the preprint can be found', () => {
    test.prop([fc.uuid(), fc.receivedReviewRequest(), fc.instant(), fc.preprintId()])(
      'when the command can be completed',
      (reviewRequestId, reviewRequest, acceptedAt, preprint) =>
        Effect.gen(function* () {
          const acceptReviewRequest = jest.fn<
            (typeof ReviewRequests.ReviewRequestCommands.Service)['acceptReviewRequest']
          >(_ => Effect.void)

          yield* TestClock.setTime(acceptedAt.epochMilliseconds)

          const actual = yield* pipe(
            _.ProcessReceivedReviewRequest(reviewRequestId),
            Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { acceptReviewRequest })),
            Effect.either,
          )

          expect(actual).toStrictEqual(Either.void)
          expect(acceptReviewRequest).toHaveBeenCalledWith({ acceptedAt, reviewRequestId: reviewRequest.id })
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprint) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
              }),
            ),
          ),
          EffectTest.run,
        ),
    )

    test.prop([
      fc.uuid(),
      fc.receivedReviewRequest(),
      fc.preprintId(),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, preprint, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
        )
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprint) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              acceptReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  describe('when it is not a preprint', () => {
    test.prop([
      fc.uuid(),
      fc.receivedReviewRequest(),
      fc.instant(),
      fc.anything().map(cause => new Preprints.NotAPreprint({ cause })),
    ])('when the command can be completed', (reviewRequestId, reviewRequest, rejectedAt, preprintError) =>
      Effect.gen(function* () {
        const rejectReviewRequest = jest.fn<
          (typeof ReviewRequests.ReviewRequestCommands.Service)['rejectReviewRequest']
        >(_ => Effect.void)

        yield* TestClock.setTime(rejectedAt.epochMilliseconds)

        const actual = yield* pipe(
          _.ProcessReceivedReviewRequest(reviewRequestId),
          Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { rejectReviewRequest })),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.void)
        expect(rejectReviewRequest).toHaveBeenCalledWith({
          rejectedAt,
          reviewRequestId: reviewRequest.id,
          reason: 'not-a-preprint',
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.receivedReviewRequest(),
      fc.anything().map(cause => new Preprints.NotAPreprint({ cause })),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, preprintError, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
        )
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              rejectReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  describe("when the preprint can't be found", () => {
    test.prop([
      fc.uuid(),
      fc.receivedReviewRequest(),
      fc.instant(),
      fc.anything().map(cause => new Preprints.PreprintIsNotFound({ cause })),
    ])('when the command can be completed', (reviewRequestId, reviewRequest, rejectedAt, preprintError) =>
      Effect.gen(function* () {
        const rejectReviewRequest = jest.fn<
          (typeof ReviewRequests.ReviewRequestCommands.Service)['rejectReviewRequest']
        >(_ => Effect.void)

        yield* TestClock.setTime(rejectedAt.epochMilliseconds)

        const actual = yield* pipe(
          _.ProcessReceivedReviewRequest(reviewRequestId),
          Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { rejectReviewRequest })),
          Effect.either,
        )

        expect(actual).toStrictEqual(Either.void)
        expect(rejectReviewRequest).toHaveBeenCalledWith({
          rejectedAt,
          reviewRequestId: reviewRequest.id,
          reason: 'unknown-preprint',
        })
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc.receivedReviewRequest(),
      fc.anything().map(cause => new Preprints.PreprintIsNotFound({ cause })),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, preprintError, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
        )
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              rejectReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.receivedReviewRequest(),
    fc.anything().map(cause => new Preprints.PreprintIsUnavailable({ cause })),
  ])("when the preprint can't be loaded", (reviewRequestId, reviewRequest, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(
        Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
      )
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(
          new ReviewRequests.ReviewRequestHasBeenAccepted({ cause }),
          new ReviewRequests.ReviewRequestHasBeenRejected({ cause }),
          new ReviewRequests.UnknownReviewRequest({ cause }),
          new ReviewRequests.UnableToQuery({ cause }),
        ),
      ),
  ])("when the review request can't be loaded", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReceivedReviewRequest: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
