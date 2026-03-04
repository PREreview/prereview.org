import { Effect } from 'effect'
import * as ReviewRequests from '../ReviewRequests/index.ts'
import { Temporal, type Uuid } from '../types/index.ts'

export const WithdrawReviewRequest = Effect.fnUntraced(function* ({ reviewRequestId }: { reviewRequestId: Uuid.Uuid }) {
  const withdrawnAt = yield* Temporal.currentInstant

  yield* ReviewRequests.withdrawReviewRequest({
    reviewRequestId,
    withdrawnAt,
    reason: 'preprint-withdrawn-from-preprint-server',
  })
})
