import { describe, expect, it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import { Nodemailer } from '../../../src/ExternalApis/index.ts'
import { Email } from '../../../src/ExternalInteractions/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Workflows/AcknowledgeReviewRequest.ts'
import * as fc from '../../fc.ts'

describe('AcknowledgeReviewRequest', () => {
  describe('when the request can be acknowledged', () => {
    it.effect.prop(
      'when the command can be completed',
      [fc.uuid(), fc.reviewRequestToAcknowledge()],
      ([reviewRequestId, reviewRequest]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(Email.Email, { acknowledgeReviewRequest: () => Effect.void }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              recordEmailSentToAcknowledgeReviewRequest: () => Effect.void,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )
    it.effect.prop(
      "when the command can't be completed",
      [
        fc.uuid(),
        fc.reviewRequestToAcknowledge(),
        fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
      ],
      ([reviewRequestId, reviewRequest, error]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(
            Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({ cause: error })),
          )
        }).pipe(
          Effect.provide([
            Layer.mock(Email.Email, { acknowledgeReviewRequest: () => Effect.void }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              recordEmailSentToAcknowledgeReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the acknowledgement can't be sent",
    [
      fc.uuid(),
      fc.reviewRequestToAcknowledge(),
      fc.anything().map(cause => new Nodemailer.UnableToSendEmail({ cause })),
    ],
    ([reviewRequestId, reviewRequest, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({ cause: error })))
      }).pipe(
        Effect.provide([
          Layer.mock(Email.Email, { acknowledgeReviewRequest: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the request doesn't need to acknowledged",
    [
      fc.uuid(),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(
            new ReviewRequests.ReviewRequestCannotBeAcknowledged({ cause }),
            new ReviewRequests.ReviewRequestWasAlreadyAcknowledged({ cause }),
          ),
        ),
    ],
    ([reviewRequestId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide([
          Layer.mock(Email.Email, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestToAcknowledge: () => error }),
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
            new ReviewRequests.ReviewRequestHasBeenRejected({ cause }),
            new ReviewRequests.ReviewRequestHasNotBeenAccepted({ cause }),
            new ReviewRequests.UnknownReviewRequest({ cause }),
            new Queries.UnableToQuery({ cause }),
          ),
        ),
    ],
    ([reviewRequestId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({})))
      }).pipe(
        Effect.provide([
          Layer.mock(Email.Email, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestToAcknowledge: () => error }),
        ]),
      ),
  )
})
