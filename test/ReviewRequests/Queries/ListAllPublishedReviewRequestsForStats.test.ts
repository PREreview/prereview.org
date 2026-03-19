import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/ListAllPublishedReviewRequestsForStats.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const request3Id = Uuid.Uuid('33389df7-6e3d-4507-a59e-3215d82e2375')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const now = Temporal.Now.instant()

const request1Started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
  reviewRequestId: request1Id,
})
const request1Published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request1Withdrawn = new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
})

const request2Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 72 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(requester1),
  reviewRequestId: request2Id,
})
const request2Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 1 }),
  reviewRequestId: request2Id,
})

const request3Imported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId2,
  requester: { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
  reviewRequestId: request3Id,
})

test.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, unknown]>([
  ['no events', [], []],
  ['only pending publication', [request1Started], []],
  ['published request', [request1Started, request1Published], [expect.objectContaining({ requestId: request1Id })]],
  ['published then withdrawn', [request1Started, request1Published, request1Withdrawn], []],
  [
    'multiple published requests',
    [request1Started, request1Published, request2Received, request2Accepted, request3Imported],
    expect.arrayContaining([
      expect.objectContaining({ requestId: request1Id }),
      expect.objectContaining({ requestId: request2Id }),
      expect.objectContaining({ requestId: request3Id }),
    ]),
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListAllPublishedReviewRequestsForStats

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Either.right(expected))
})
