import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/WithdrawReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const requester2 = { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' as const }

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

const accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})

const importedPrereviewer = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId1,
  requester: requester2,
  reviewRequestId: request1Id,
})

const importedPreprintServer = new ReviewRequests.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(requester1),
  reviewRequestId: request1Id,
})

const withdrawn = new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
})

const command = {
  withdrawnAt: Temporal.Now.instant(),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
} satisfies _.Command

describe.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>]>([
  ['no events', []],
  ['received but not accepted', [received]],
])('review request has not been published (%s)', (_case, events) => {
  it('rejects the command with an error', () => {
    const state = _.foldState(events, command)

    const actual = _.decide(state, command)

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })
})

describe.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>]>([
  ['received and accepted', [accepted, received]],
  ['imported from a PREreviewer', [importedPrereviewer]],
  ['imported from a preprint server', [importedPreprintServer]],
])('review request has been published (%s)', (_case, events) => {
  it('withdraws the review request', () => {
    const state = _.foldState(events, command)

    const actual = _.decide(state, command)

    expect(actual).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
            withdrawnAt: command.withdrawnAt,
            reviewRequestId: command.reviewRequestId,
            reason: command.reason,
          }),
        ),
      ),
    )
  })
})

describe.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>]>([
  ['received and accepted', [accepted, received, withdrawn]],
  ['imported from a PREreviewer', [importedPrereviewer, withdrawn]],
  ['imported from a preprint server', [importedPreprintServer, withdrawn]],
])('review request has been withdrawn (%s)', (_case, events) => {
  it('does nothing', () => {
    const state = _.foldState(events, command)

    const actual = _.decide(state, command)

    expect(actual).toStrictEqual(Either.right(Option.none()))
  })
})
