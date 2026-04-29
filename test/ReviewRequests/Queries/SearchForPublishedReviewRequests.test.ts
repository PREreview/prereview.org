import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import { expect } from 'vitest'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/SearchForPublishedReviewRequests.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'

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
const preprintId4 = new Preprints.AdvancePreprintId({ value: Doi.Doi('10.31124/12345') })
const preprintId5 = new Preprints.AdvancePreprintId({ value: Doi.Doi('10.31124/67890') })
const preprintId6 = new Preprints.PreprintsorgPreprintId({ value: Doi.Doi('10.20944/12345') })
const preprintId7 = new Preprints.PreprintsorgPreprintId({ value: Doi.Doi('10.20944/67890') })
const preprintId8 = new Preprints.AuthoreaPreprintId({ value: Doi.Doi('10.22541/12345') })
const preprintId9 = new Preprints.AuthoreaPreprintId({ value: Doi.Doi('10.22541/67890') })

const now = Temporal.Now.instant()

const request1Started1 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
  reviewRequestId: request1Id,
})
const request1Started2 = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ minutes: 20 }),
  preprintId: preprintId2,
  requesterId: OrcidId.OrcidId('0000-0002-6109-0367'),
  reviewRequestId: request1Id,
})
const request1Published1 = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request1Withdrawn = new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
})
const request1Published2 = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ minutes: 10 }),
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
const request1Recategorized = new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
  language: 'pt',
  reviewRequestId: request1Id,
})
const request2Received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: now.subtract({ hours: 72 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId1,
  requester: Option.some(requester3),
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
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId3,
  requester: Option.some(requester4),
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
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId4,
  requester: Option.some(requester1),
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
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId5,
  requester: Option.some(requester1),
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
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId6,
  requester: Option.some(requester2),
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
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId7,
  requester: Option.some(requester3),
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
const request8Imported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId8,
  requester: { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
  reviewRequestId: request8Id,
})
const request8Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request8Id,
})
const request9Imported = new ReviewRequests.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: now.subtract({ hours: 9 }),
  receivedFrom: new URL('http://example.com'),
  preprintId: preprintId9,
  requester: Option.some(requester1),
  reviewRequestId: request9Id,
})
const request9Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request9Id,
})

test.each<[string, _.Input, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', { page: 1 }, [], Either.left(new ReviewRequests.NoReviewRequestsFound({}))],
  [
    'no received events',
    { page: 1 },
    [request1Published1, request1Categorized1],
    Either.left(new ReviewRequests.NoReviewRequestsFound({})),
  ],
  [
    'no accepted events',
    { page: 1 },
    [request1Started1, request1Categorized1],
    Either.left(new ReviewRequests.NoReviewRequestsFound({})),
  ],
  [
    'only recieved and accepted events',
    { page: 1 },
    [request1Started1, request1Started2, request1Published1, request1Published2],
    Either.right({
      currentPage: 1,
      totalPages: 1,
      language: undefined,
      field: undefined,
      reviewRequests: [
        {
          id: request1Id,
          published: request1Published2.publishedAt,
          topics: [],
          preprintId: request1Started2.preprintId,
        },
      ],
    }),
  ],
  [
    'request was withdrawn',
    { page: 1 },
    [request1Started1, request1Published1, request1Withdrawn],
    Either.left(new ReviewRequests.NoReviewRequestsFound({})),
  ],
  [
    'impossible page',
    { page: 0 },
    [request1Started1, request1Published1, request1Categorized1, request2Accepted],
    Either.left(new ReviewRequests.NoReviewRequestsFound({})),
  ],
  [
    'multiple requests for same preprint',
    { page: 1 },
    [request1Started1, request1Published1, request2Received, request2Accepted],
    Either.right({
      currentPage: 1,
      totalPages: 1,
      language: undefined,
      field: undefined,
      reviewRequests: [
        {
          id: request2Id,
          published: request2Accepted.acceptedAt,
          topics: [],
          preprintId: request2Received.preprintId,
        },
      ],
    }),
  ],
  [
    'more results',
    { page: 1 },
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
      request5Received,
      request5Accepted,
      request5Categorized,
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
    Either.right({
      currentPage: 1,
      totalPages: 2,
      language: undefined,
      field: undefined,
      reviewRequests: [
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
          topics: request4Categorized.topics,
          preprintId: request4Received.preprintId,
        },
        {
          id: request5Id,
          published: request5Accepted.acceptedAt,
          topics: request5Categorized.topics,
          preprintId: request5Received.preprintId,
        },
        {
          id: request6Id,
          published: request6Accepted.acceptedAt,
          topics: request6Categorized.topics,
          preprintId: request6Received.preprintId,
        },
      ],
    }),
  ],
  [
    'second page',
    { page: 2 },
    [
      request1Started1,
      request1Started2,
      request1Published1,
      request1Categorized1,
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
      request8Imported,
      request8Categorized,
      request9Imported,
      request9Categorized,
    ],
    Either.right({
      currentPage: 2,
      totalPages: 2,
      language: undefined,
      field: undefined,
      reviewRequests: [
        {
          id: request7Id,
          published: request7Accepted.acceptedAt,
          topics: request7Categorized.topics,
          preprintId: request7Received.preprintId,
        },
        {
          id: request8Id,
          published: request8Imported.publishedAt,
          topics: request8Categorized.topics,
          preprintId: request8Imported.preprintId,
        },
        {
          id: request9Id,
          published: request9Imported.publishedAt,
          topics: request9Categorized.topics,
          preprintId: request9Imported.preprintId,
        },
      ],
    }),
  ],
  [
    'no matches on language',
    { page: 1, language: 'es' as const },
    [
      request1Started1,
      request1Published1,
      request1Categorized1,
      request1Categorized2,
      request2Received,
      request2Accepted,
    ],
    Either.left(new ReviewRequests.NoReviewRequestsFound({})),
  ],
  [
    'matches on language',
    { page: 1, language: 'pt' as const },
    [
      request1Started1,
      request1Started2,
      request1Published1,
      request1Categorized1,
      request1Categorized2,
      request1Published2,
      request2Received,
      request2Accepted,
    ],
    Either.right({
      currentPage: 1,
      totalPages: 1,
      language: 'pt',
      field: undefined,
      reviewRequests: [
        {
          id: request1Id,
          published: request1Published2.publishedAt,
          topics: request1Categorized2.topics,
          preprintId: request1Started2.preprintId,
        },
      ],
    }),
  ],
  [
    'matches on language that has changed',
    { page: 1, language: 'pt' as const },
    [request1Started1, request1Published1, request1Categorized1, request1Recategorized],
    Either.right({
      currentPage: 1,
      totalPages: 1,
      language: 'pt',
      field: undefined,
      reviewRequests: [
        {
          id: request1Id,
          published: request1Published1.publishedAt,
          topics: request1Categorized1.topics,
          preprintId: request1Started1.preprintId,
        },
      ],
    }),
  ],
  [
    'matches on field',
    { page: 1, field: '20' },
    [
      request1Started1,
      request1Started2,
      request1Published1,
      request1Categorized1,
      request1Categorized2,
      request1Published2,
      request2Received,
      request2Accepted,
    ],
    Either.right({
      currentPage: 1,
      totalPages: 1,
      language: undefined,
      field: '20',
      reviewRequests: [
        {
          id: request1Id,
          published: request1Published2.publishedAt,
          topics: request1Categorized2.topics,
          preprintId: request1Started2.preprintId,
        },
      ],
    }),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.SearchForPublishedReviewRequests

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
