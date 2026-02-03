import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import { Nodemailer } from '../../../src/ExternalApis/index.ts'
import { Email } from '../../../src/ExternalInteractions/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/AcknowledgeReviewRequest.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('AcknowledgeReviewRequest', () => {
  describe('when the request can be acknowledged', () => {
    test.prop([fc.uuid(), fc.reviewRequestToAcknowledge()])(
      'when the command can be completed',
      (reviewRequestId, reviewRequest) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              Layer.mock(Email.Email, { acknowledgeReviewRequest: () => Effect.void }),
              Layer.mock(ReviewRequests.ReviewRequestCommands, {
                recordEmailSentToAcknowledgeReviewRequest: () => Effect.void,
              }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
              }),
            ),
          ),
          EffectTest.run,
        ),
    )
    test.prop([
      fc.uuid(),
      fc.reviewRequestToAcknowledge(),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({ cause: error })))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(Email.Email, { acknowledgeReviewRequest: () => Effect.void }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              recordEmailSentToAcknowledgeReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.reviewRequestToAcknowledge(),
    fc.anything().map(cause => new Nodemailer.UnableToSendEmail({ cause })),
  ])("when the acknowledgement can't be sent", (reviewRequestId, reviewRequest, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Email.Email, { acknowledgeReviewRequest: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getReviewRequestToAcknowledge: () => Effect.succeed(reviewRequest),
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
          new ReviewRequests.ReviewRequestCannotBeAcknowledged({ cause }),
          new ReviewRequests.ReviewRequestWasAlreadyAcknowledged({ cause }),
        ),
      ),
  ])("when the request doesn't need to acknowledged", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Email.Email, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestToAcknowledge: () => error }),
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
          new ReviewRequests.ReviewRequestHasBeenRejected({ cause }),
          new ReviewRequests.ReviewRequestHasNotBeenAccepted({ cause }),
          new ReviewRequests.UnknownReviewRequest({ cause }),
          new Queries.UnableToQuery({ cause }),
        ),
      ),
  ])("when the review request can't be loaded", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.AcknowledgeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToAcknowledgeReviewRequest({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(Email.Email, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getReviewRequestToAcknowledge: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
