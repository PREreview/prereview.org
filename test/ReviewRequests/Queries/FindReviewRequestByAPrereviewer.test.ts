import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/FindReviewRequestByAPrereviewer.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const requesterId1 = OrcidId.OrcidId('0000-0002-1825-0097')
const requesterId2 = OrcidId.OrcidId('0000-0002-6109-0367')

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const now = Temporal.Now.instant()

const request1Started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: requesterId1,
  reviewRequestId: request1Id,
})
const request1Published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request2Imported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId1,
  requester: { orcidId: requesterId1, persona: 'public' },
  reviewRequestId: request2Id,
})

test.each<[string, _.Input, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', { requesterId: requesterId1, preprintId: preprintId1 }, [], Option.none()],
  [
    'has been started',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [request1Started],
    Option.some({ _tag: 'ReviewRequestPendingPublication', id: request1Id }),
  ],
  [
    'has been imported',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [request2Imported],
    Option.some({ _tag: 'PublishedReviewRequest', id: request2Id }),
  ],
  [
    'different preprint (started)',
    { requesterId: requesterId1, preprintId: preprintId2 },
    [request1Started],
    Option.none(),
  ],
  [
    'different requester (started)',
    { requesterId: requesterId2, preprintId: preprintId1 },
    [request1Started],
    Option.none(),
  ],
  [
    'different preprint (imported)',
    { requesterId: requesterId1, preprintId: preprintId2 },
    [request2Imported],
    Option.none(),
  ],
  [
    'different requester (imported)',
    { requesterId: requesterId2, preprintId: preprintId1 },
    [request2Imported],
    Option.none(),
  ],
  [
    'is ready to be published',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [request1Started],
    Option.some({ _tag: 'ReviewRequestPendingPublication', id: request1Id }),
  ],
  [
    'has been published',
    { requesterId: requesterId1, preprintId: preprintId1 },
    [request1Started, request1Published],
    Option.some({ _tag: 'PublishedReviewRequest', id: request1Id }),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.FindReviewRequestByAPrereviewer

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
