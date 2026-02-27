import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import * as _ from '../../../src/ReviewRequests/Commands/WithdrawReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Uuid } from '../../../src/types/index.ts'

describe('review request has not been published', () => {
  const events = [] satisfies ReadonlyArray<ReviewRequests.ReviewRequestEvent>
  const command = {
    withdrawnAt: Temporal.Now.instant(),
    reviewRequestId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
    reason: 'preprint-withdrawn-from-preprint-server',
  } satisfies _.Command

  it('rejects the command with an error', () => {
    const state = _.foldState(events, command)

    const actual = _.decide(state, command)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })
})

describe('review request has been published', () => {
  it.todo('withdraws the review request')
})

describe('review request has been withdrawn', () => {
  it.todo('does nothing')
})
