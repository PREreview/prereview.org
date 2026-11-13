import { Argument, Command } from 'effect/cli'
import { Effect, pipe } from 'effect'
import * as ReviewRequests from '../Domain/ReviewRequests/index.ts'
import { Temporal, Uuid } from '../types/index.ts'

const reviewRequestId = pipe(Argument.String('reviewRequestId'), Argument.withSchema(Uuid.UuidSchema))

const reason = Argument.ChoiceWithValue('reason', [
  ['Preprint withdrawn from preprint server', 'preprint-withdrawn-from-preprint-server' as const],
  ['Mistakenly requested', 'mistakenly-requested' as const],
  ['Requester changed their mind', 'requester-changed-their-mind' as const],
])

const program = Effect.fnUntraced(function* ({
  reviewRequestId,
  reason,
}: {
  reviewRequestId: Uuid.Uuid
  reason: 'preprint-withdrawn-from-preprint-server' | 'mistakenly-requested' | 'requester-changed-their-mind'
}) {
  const withdrawnAt = yield* Temporal.currentInstant

  yield* ReviewRequests.withdrawReviewRequest({
    reviewRequestId,
    withdrawnAt,
    reason,
  })
})

export const WithdrawReviewRequest = Command.make('withdraw-review-request', { reviewRequestId, reason }, program)
