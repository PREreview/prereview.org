import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/ReviewRequests/Queries/GetFiveMostRecentReviewRequests.ts'
import { Doi, Name, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const requester1 = { name: Name.Name('Josiah Carberry') }
const requester2 = { name: Name.Name('Jean-Baptiste Botul') }
const requester3 = { name: Name.Name('Arne Saknussemm') }
const requester4 = { name: Name.Name('Axel Lidenbrock') }

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const request3Id = Uuid.Uuid('33389df7-6e3d-4507-a59e-3215d82e2375')
const request4Id = Uuid.Uuid('452eb59b-5f3a-45b1-9822-40e86d27ef3f')
const request5Id = Uuid.Uuid('94cb8a68-a61f-49d7-b8cb-90c75787a3bc')
const request6Id = Uuid.Uuid('46a5b91d-2719-4a76-b894-49f669f9cc14')
const request7Id = Uuid.Uuid('6b1c8df6-0bb2-4c5b-82a1-af654de00e3d')
const request8Id = Uuid.Uuid('dfc93fc9-f661-4fab-979b-d14e168c93a0')
const request9Id = Uuid.Uuid('f8d3deca-594e-4902-a831-53add29edfcc')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })
const preprintId3 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId4 = new Preprints.AdvancePreprintId({ value: Doi.Doi('10.31124/12345') })
const preprintId5 = new Preprints.AdvancePreprintId({ value: Doi.Doi('10.31124/67890') })
const preprintId6 = new Preprints.PreprintsorgPreprintId({ value: Doi.Doi('10.20944/12345') })

const now = Temporal.Now.instant()

const request1Started1 = new Events.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
  reviewRequestId: request1Id,
})
const request1Started2 = new Events.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ minutes: 20 }),
  preprintId: preprintId2,
  requesterId: OrcidId.OrcidId('0000-0002-6109-0367'),
  reviewRequestId: request1Id,
})
const request1Published1 = new Events.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request1Published2 = new Events.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
})
const request1Withdrawn = new Events.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
})
const request1Categorized1 = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  topics: ['13741', '12422'],
  reviewRequestId: request1Id,
})
const request1Categorized2 = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  topics: ['13499'],
  reviewRequestId: request1Id,
})
const request2Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 72 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(requester3),
  reviewRequestId: request2Id,
})
const request2Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 1 }),
  reviewRequestId: request2Id,
})
const request2Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  topics: ['14362'],
  reviewRequestId: request2Id,
})
const request3Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId3,
  requester: Option.some(requester4),
  reviewRequestId: request3Id,
})
const request3Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 3 }),
  reviewRequestId: request3Id,
})
const request3Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request3Id,
})
const request4Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId4,
  requester: Option.some(requester1),
  reviewRequestId: request4Id,
})
const request4Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 4 }),
  reviewRequestId: request4Id,
})
const request4Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: ['10014'],
  reviewRequestId: request4Id,
})
const request4Recategorized = new Events.ReviewRequestForAPreprintWasRecategorized({
  topics: [],
  reviewRequestId: request4Id,
})
const request5Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId5,
  requester: Option.some(requester1),
  reviewRequestId: request5Id,
})
const request5Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 5 }),
  reviewRequestId: request5Id,
})
const request5Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request5Id,
})
const request5Recategorized = new Events.ReviewRequestForAPreprintWasRecategorized({
  topics: ['10003'],
  reviewRequestId: request5Id,
})
const request6Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId6,
  requester: Option.some(requester2),
  reviewRequestId: request6Id,
})
const request6Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 6 }),
  reviewRequestId: request6Id,
})
const request6Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request6Id,
})
const request7Received = new Events.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId3,
  requester: Option.some(requester3),
  reviewRequestId: request7Id,
})
const request7Accepted = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 7 }),
  reviewRequestId: request7Id,
})
const request7Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request7Id,
})
const request8Imported = new Events.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId1,
  requester: { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
  reviewRequestId: request8Id,
})
const request8Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request8Id,
})
const request9Imported = new Events.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: now.subtract({ hours: 9 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId2,
  requester: Option.some(requester1),
  reviewRequestId: request9Id,
})
const request9Categorized = new Events.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  topics: [],
  reviewRequestId: request9Id,
})

test.each<[string, ReadonlyArray<Events.ReviewRequestEvent>, _.Result]>([
  ['no events', [], []],
  ['no received events', [request1Published1], []],
  ['no accepted events', [request1Started1, request1Categorized1], []],
  ['was withdrawn', [request1Started1, request1Published1, request1Withdrawn], []],
  [
    'imported only',
    [request8Imported, request8Categorized, request9Imported, request9Categorized],
    [
      {
        id: request8Imported.reviewRequestId,
        published: request8Imported.publishedAt,
        topics: request8Categorized.topics,
        preprintId: request8Imported.preprintId,
      },
      {
        id: request9Imported.reviewRequestId,
        published: request9Imported.publishedAt,
        topics: request9Categorized.topics,
        preprintId: request9Imported.preprintId,
      },
    ],
  ],
  [
    'multiple requests for same preprint',
    [request1Started1, request1Published1, request1Categorized1, request8Imported, request8Categorized],
    [
      {
        id: request1Id,
        published: request1Published1.publishedAt,
        topics: request1Categorized1.topics,
        preprintId: request1Started1.preprintId,
      },
    ],
  ],
  [
    'more results',
    [
      request1Started1,
      request1Started2,
      request1Published1,
      request1Categorized1,
      request1Categorized2,
      request1Published2,
      request2Received,
      request2Accepted,
      request2Categorized,
      request3Received,
      request3Accepted,
      request3Categorized,
      request4Received,
      request4Accepted,
      request4Categorized,
      request4Recategorized,
      request5Received,
      request5Accepted,
      request5Categorized,
      request5Recategorized,
      request6Received,
      request6Accepted,
      request6Categorized,
      request7Received,
      request7Accepted,
      request7Categorized,
      request8Imported,
      request8Categorized,
      request9Imported,
      request9Categorized,
    ],
    [
      {
        id: request2Id,
        published: request2Accepted.acceptedAt,
        topics: request2Categorized.topics,
        preprintId: request2Received.preprintId,
      },
      {
        id: request1Id,
        published: request1Published2.publishedAt,
        topics: request1Categorized2.topics,
        preprintId: request1Started2.preprintId,
      },
      {
        id: request4Id,
        published: request4Accepted.acceptedAt,
        topics: request4Recategorized.topics!,
        preprintId: request4Received.preprintId,
      },
      {
        id: request5Id,
        published: request5Accepted.acceptedAt,
        topics: request5Recategorized.topics!,
        preprintId: request5Received.preprintId,
      },
      {
        id: request6Id,
        published: request6Accepted.acceptedAt,
        topics: request6Categorized.topics,
        preprintId: request6Received.preprintId,
      },
    ],
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.GetFiveMostRecentReviewRequests

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed(expected))
})
