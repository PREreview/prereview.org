import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetFiveMostRecentReviewRequests.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }
const requester2 = { name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul') }
const requester3 = { name: NonEmptyString.NonEmptyString('Arne Saknussemm') }
const requester4 = { name: NonEmptyString.NonEmptyString('Axel Lidenbrock') }

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

const now = Temporal.Now.instant()

const request1Received1 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requester: requester1,
  reviewRequestId: request1Id,
})
const request1Received2 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ minutes: 20 }),
  preprintId: preprintId2,
  requester: requester2,
  reviewRequestId: request1Id,
})
const request1Accepted1 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request1Accepted2 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
})
const request1Categorized1 = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  keywords: ['bc372b08bff50a48358e', 'd164de1eaf4ecfbd8833'],
  topics: ['13741', '12422'],
  reviewRequestId: request1Id,
})
const request1Categorized2 = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  keywords: ['fffb69d173e337ffae7f'],
  topics: ['13499'],
  reviewRequestId: request1Id,
})
const request2Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 72 }),
  preprintId: preprintId1,
  requester: requester3,
  reviewRequestId: request2Id,
})
const request2Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 1 }),
  reviewRequestId: request2Id,
})
const request2Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  keywords: ['c987684a37236009cfa7'],
  topics: ['14362'],
  reviewRequestId: request2Id,
})
const request3Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId3,
  requester: requester4,
  reviewRequestId: request3Id,
})
const request3Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 3 }),
  reviewRequestId: request3Id,
})
const request3Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request3Id,
})
const request4Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: requester1,
  reviewRequestId: request4Id,
})
const request4Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 4 }),
  reviewRequestId: request4Id,
})
const request4Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request4Id,
})
const request5Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: requester1,
  reviewRequestId: request5Id,
})
const request5Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 5 }),
  reviewRequestId: request5Id,
})
const request5Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request5Id,
})
const request6Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId2,
  requester: requester2,
  reviewRequestId: request6Id,
})
const request6Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 6 }),
  reviewRequestId: request6Id,
})
const request6Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request6Id,
})
const request7Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId3,
  requester: requester3,
  reviewRequestId: request7Id,
})
const request7Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 7 }),
  reviewRequestId: request7Id,
})
const request7Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request7Id,
})
const request8Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: requester4,
  reviewRequestId: request8Id,
})
const request8Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 8 }),
  reviewRequestId: request8Id,
})
const request8Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request8Id,
})
const request9Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId2,
  requester: requester1,
  reviewRequestId: request9Id,
})
const request9Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 9 }),
  reviewRequestId: request9Id,
})
const request9Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request9Id,
})

test.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', [], []],
  ['no received events', [request1Accepted1], []],
  ['no accepted events', [request1Received1, request1Categorized1], []],
  [
    'more results',
    [
      request1Received1,
      request1Accepted1,
      request1Categorized1,
      request1Categorized2,
      request1Received2,
      request1Accepted2,
      request2Received,
      request2Accepted,
      request2Categorized,
      request3Received,
      request3Accepted,
      request3Categorized,
      request4Received,
      request4Accepted,
      request4Categorized,
      request5Received,
      request5Accepted,
      request5Categorized,
      request6Received,
      request6Accepted,
      request6Categorized,
      request7Received,
      request7Accepted,
      request7Categorized,
      request8Received,
      request8Accepted,
      request8Categorized,
      request9Received,
      request9Accepted,
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
        published: request1Accepted2.acceptedAt,
        topics: request1Categorized2.topics,
        preprintId: request1Received2.preprintId,
      },
      {
        id: request3Id,
        published: request3Accepted.acceptedAt,
        topics: request3Categorized.topics,
        preprintId: request3Received.preprintId,
      },
      {
        id: request4Id,
        published: request4Accepted.acceptedAt,
        topics: request4Categorized.topics,
        preprintId: request4Received.preprintId,
      },
      {
        id: request5Id,
        published: request5Accepted.acceptedAt,
        topics: request5Categorized.topics,
        preprintId: request5Received.preprintId,
      },
    ],
  ],
])('query (%s)', (_name, events, expected) => {
  const actual = _.query(events)

  expect(actual).toStrictEqual(expected)
})
