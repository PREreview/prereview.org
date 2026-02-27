import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/WithdrawReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })

const now = Temporal.Now.instant()

const received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(requester1),
  reviewRequestId: request1Id,
})

describe.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>]>([
  ['no events', []],
  ['received but not accepted', [received]],
])('review request has not been published (%s)', (_case, events) => {
  const command = {
    withdrawnAt: Temporal.Now.instant(),
    reviewRequestId: request1Id,
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
