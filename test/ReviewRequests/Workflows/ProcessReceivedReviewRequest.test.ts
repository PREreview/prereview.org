import { it } from '@effect/vitest'
import { Effect, Either, Layer, pipe, TestClock } from 'effect'
import { describe, expect, vi } from 'vitest'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Workflows/ProcessReceivedReviewRequest.ts'
import * as fc from '../../fc.ts'

describe('ProcessReceivedReviewRequest', () => {
  describe('when the preprint can be found', () => {
    it.effect.prop(
      'when the command can be completed',
      [fc.uuid(), fc.receivedReviewRequest(), fc.instant(), fc.preprintId()],
      ([reviewRequestId, reviewRequest, acceptedAt, preprint]) =>
        Effect.gen(function* () {
          const acceptReviewRequest = vi.fn<
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
          Effect.provide([
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprint) }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when the command can't be completed",
      [
        fc.uuid(),
        fc.receivedReviewRequest(),
        fc.preprintId(),
        fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
      ],
      ([reviewRequestId, reviewRequest, preprint, error]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(
            Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
          )
        }).pipe(
          Effect.provide([
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => Effect.succeed(preprint) }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              acceptReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )
  })

  describe('when it is not a preprint', () => {
    it.effect.prop(
      'when the command can be completed',
      [
        fc.uuid(),
        fc.receivedReviewRequest(),
        fc.instant(),
        fc.anything().map(cause => new Preprints.NotAPreprint({ cause })),
      ],
      ([reviewRequestId, reviewRequest, rejectedAt, preprintError]) =>
        Effect.gen(function* () {
          const rejectReviewRequest = vi.fn<
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
          Effect.provide([
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when the command can't be completed",
      [
        fc.uuid(),
        fc.receivedReviewRequest(),
        fc.anything().map(cause => new Preprints.NotAPreprint({ cause })),
        fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
      ],
      ([reviewRequestId, reviewRequest, preprintError, error]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(
            Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
          )
        }).pipe(
          Effect.provide([
            Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              rejectReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the preprint can't be found",
    [fc.uuid(), fc.receivedReviewRequest(), fc.anything().map(cause => new Preprints.PreprintIsNotFound({ cause }))],
    ([reviewRequestId, reviewRequest, preprintError]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(preprintError))
      }).pipe(
        Effect.provide([
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => preprintError }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the preprint can't be loaded",
    [fc.uuid(), fc.receivedReviewRequest(), fc.anything().map(cause => new Preprints.PreprintIsUnavailable({ cause }))],
    ([reviewRequestId, reviewRequest, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({ cause: error })),
        )
      }).pipe(
        Effect.provide([
          Layer.mock(Preprints.Preprints, { resolvePreprintId: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReceivedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the review request can't be loaded",
    [
      fc.uuid(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(
            new ReviewRequests.ReviewRequestHasBeenAccepted({ cause }),
            new ReviewRequests.ReviewRequestHasBeenRejected({ cause }),
            new ReviewRequests.UnknownReviewRequest({ cause }),
            new Queries.UnableToQuery({ cause }),
          ),
        ),
    ],
    ([reviewRequestId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessReceivedReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToProcessReceivedReviewRequest({})))
      }).pipe(
        Effect.provide([
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReceivedReviewRequest: () => error }),
        ]),
      ),
  )
})
