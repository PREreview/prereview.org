import { it } from '@effect/vitest'
import { Effect, Either, Layer, pipe } from 'effect'
import { describe, expect } from 'vitest'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as Inbox from '../../../src/WebApp/Inbox/index.ts'
import * as _ from '../../../src/WebApp/Inbox/ProcessCoarNotifyMessage.ts'
import * as fc from '../../fc.ts'

describe('ProcessCoarNotifyMessage', () => {
  it.effect.prop(
    'when the command can be completed',
    [fc.coarNotifyRequestReview(), fc.uuid(), fc.instant()],
    ([message, messageId, receivedAt]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { receiveReviewRequest: () => Effect.void })),
      ),
  )

  it.effect.prop(
    "when the command can't be completed",
    [
      fc.coarNotifyRequestReview(),
      fc.uuid(),
      fc.instant(),
      fc.anything().map(cause => new ReviewRequests.UnableToHandleCommand({ cause })),
    ],
    ([message, messageId, receivedAt, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

        expect(actual).toStrictEqual(Either.left(new Inbox.FailedToProcessRequestReview({ cause: error })))
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, { receiveReviewRequest: () => error }))),
  )

  it.effect.prop(
    'when the DOI is not for a preprint',
    [fc.coarNotifyRequestReview({ objectCiteAs: fc.nonPreprintDoi() }), fc.uuid(), fc.instant()],
    ([message, messageId, receivedAt]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.ProcessCoarNotifyMessage({ message, messageId, receivedAt }), Effect.either)

        expect(actual).toStrictEqual(Either.left(new Inbox.RejectedRequestReview()))
      }).pipe(Effect.provide(Layer.mock(ReviewRequests.ReviewRequestCommands, {}))),
  )
})
