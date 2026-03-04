import { Args, Command } from '@effect/cli'
import { Effect, pipe } from 'effect'
import * as ReviewRequests from '../ReviewRequests/index.ts'
import { Temporal, Uuid } from '../types/index.ts'

const reviewRequestId = pipe(Args.text({ name: 'reviewRequestId' }), Args.withSchema(Uuid.UuidSchema))

const program = Effect.fnUntraced(function* ({ reviewRequestId }: { reviewRequestId: Uuid.Uuid }) {
  const withdrawnAt = yield* Temporal.currentInstant

  yield* ReviewRequests.withdrawReviewRequest({
    reviewRequestId,
    withdrawnAt,
    reason: 'preprint-withdrawn-from-preprint-server',
  })
})

export const WithdrawReviewRequest = Command.make('withdraw-review-request', { reviewRequestId }, program)
