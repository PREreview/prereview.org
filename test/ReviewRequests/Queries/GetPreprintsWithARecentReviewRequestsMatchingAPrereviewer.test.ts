import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import type * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Prereviewers from '../../../src/Prereviewers/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.ts'
import type { KeywordId } from '../../../src/types/Keyword.ts'

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

const preprintId1 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/11111') })
const preprintId2 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/22222') })
const preprintId3 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/33333') })
const preprintId4 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/44444') })
const preprintId5 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/55555') })
const preprintId6 = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/66666') })

const keyword1Id = 'bc372b08bff50a48358e' satisfies KeywordId
const keyword2Id = 'd164de1eaf4ecfbd8833' satisfies KeywordId
const keyword3Id = 'fffb69d173e337ffae7f' satisfies KeywordId

const now = Temporal.Now.instant()

const request1Accepted1 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 1 }),
  receivedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requester: requester1,
  reviewRequestId: request1Id,
})
const request1Accepted2 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 10 }),
  receivedAt: now.subtract({ minutes: 20 }),
  preprintId: preprintId2,
  requester: requester2,
  reviewRequestId: request1Id,
})
const request1Categorized1 = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  keywords: [keyword1Id, keyword2Id],
  topics: ['13741', '12422'],
  reviewRequestId: request1Id,
})
const request1Categorized2 = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  keywords: [keyword3Id],
  topics: ['13499'],
  reviewRequestId: request1Id,
})
const request2Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ minutes: 1 }),
  receivedAt: now.subtract({ hours: 72 }),
  preprintId: preprintId1,
  requester: requester3,
  reviewRequestId: request2Id,
})
const request2Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  keywords: [keyword1Id],
  topics: ['14362'],
  reviewRequestId: request2Id,
})
const request3Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 3 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId3,
  requester: requester4,
  reviewRequestId: request3Id,
})
const request3Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword1Id],
  topics: [],
  reviewRequestId: request3Id,
})
const request4Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 4 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId4,
  requester: requester1,
  reviewRequestId: request4Id,
})
const request4Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword2Id, keyword1Id],
  topics: [],
  reviewRequestId: request4Id,
})
const request5Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 5 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: requester1,
  reviewRequestId: request5Id,
})
const request5Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword3Id, keyword1Id],
  topics: [],
  reviewRequestId: request5Id,
})
const request6Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 6 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId5,
  requester: requester2,
  reviewRequestId: request6Id,
})
const request6Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword2Id, keyword3Id],
  topics: [],
  reviewRequestId: request6Id,
})
const request7Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 7 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId6,
  requester: requester3,
  reviewRequestId: request7Id,
})
const request7Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword2Id, keyword3Id],
  topics: [],
  reviewRequestId: request7Id,
})
const request8Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 8 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId1,
  requester: requester4,
  reviewRequestId: request8Id,
})
const request8Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [],
  topics: [],
  reviewRequestId: request8Id,
})
const request9Accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: now.subtract({ hours: 9 }),
  receivedAt: now.subtract({ hours: 200 }),
  preprintId: preprintId2,
  requester: requester1,
  reviewRequestId: request9Id,
})
const request9Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'en',
  keywords: [keyword3Id],
  topics: [],
  reviewRequestId: request9Id,
})

const prereviewerId = OrcidId.OrcidId('0000-0002-1825-0097')
const otherPrereviewerId = OrcidId.OrcidId('0000-0003-4921-6155')
const prereviewerSubscribedToKeyword1 = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId,
  keywordId: keyword1Id,
})
const prereviewerSubscribedToKeyword3 = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId,
  keywordId: keyword3Id,
})
const otherPrereviewerSubscribedToKeyword1 = new Prereviewers.PrereviewerSubscribedToAKeyword({
  prereviewerId: otherPrereviewerId,
  keywordId: keyword2Id,
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', { prereviewerId }, [], []],
  ['no accepted events', { prereviewerId }, [prereviewerSubscribedToKeyword1, request1Categorized1], []],
  [
    'no matching keywords',
    { prereviewerId },
    [
      prereviewerSubscribedToKeyword1,
      otherPrereviewerSubscribedToKeyword1,
      request1Accepted1,
      request1Accepted2,
      request1Categorized1,
      request1Categorized2,
    ],
    [],
  ],
  [
    'one matching keyword',
    { prereviewerId },
    [
      prereviewerSubscribedToKeyword1,
      prereviewerSubscribedToKeyword3,
      request1Accepted1,
      request1Accepted2,
      request1Categorized1,
      request1Categorized2,
    ],
    [
      {
        preprintId: request1Accepted2.preprintId,
        firstRequested: request1Accepted2.acceptedAt,
        lastRequested: request1Accepted2.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword3.keywordId],
      },
    ],
  ],
  [
    'multiple requests for a preprint',
    { prereviewerId },
    [
      prereviewerSubscribedToKeyword1,
      prereviewerSubscribedToKeyword3,
      request1Accepted1,
      request1Accepted2,
      request1Categorized1,
      request1Categorized2,
      request9Accepted,
      request9Categorized,
    ],
    [
      {
        preprintId: request1Accepted2.preprintId,
        firstRequested: request9Accepted.acceptedAt,
        lastRequested: request1Accepted2.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword3.keywordId],
      },
    ],
  ],
  [
    'many matching preprints and keywords',
    { prereviewerId },
    [
      prereviewerSubscribedToKeyword1,
      prereviewerSubscribedToKeyword3,
      request1Accepted1,
      request1Categorized1,
      request1Categorized2,
      request1Accepted2,
      request2Accepted,
      request2Categorized,
      request3Accepted,
      request3Categorized,
      request4Accepted,
      request4Categorized,
      request5Accepted,
      request5Categorized,
      request6Accepted,
      request6Categorized,
      request7Accepted,
      request7Categorized,
      request8Accepted,
      request8Categorized,
      request9Accepted,
      request9Categorized,
    ],
    [
      {
        preprintId: preprintId1,
        firstRequested: request5Accepted.acceptedAt,
        lastRequested: request2Accepted.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword1.keywordId, prereviewerSubscribedToKeyword3.keywordId],
      },
      {
        preprintId: preprintId2,
        firstRequested: request9Accepted.acceptedAt,
        lastRequested: request1Accepted2.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword3.keywordId],
      },
      {
        preprintId: preprintId3,
        firstRequested: request3Accepted.acceptedAt,
        lastRequested: request3Accepted.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword1.keywordId],
      },
      {
        preprintId: preprintId4,
        firstRequested: request4Accepted.acceptedAt,
        lastRequested: request4Accepted.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword1.keywordId],
      },
      {
        preprintId: preprintId5,
        firstRequested: request6Accepted.acceptedAt,
        lastRequested: request6Accepted.acceptedAt,
        matchingKeywords: [prereviewerSubscribedToKeyword3.keywordId],
      },
    ],
  ],
])('query (%s)', (_name, input, events, expected) => {
  const actual = _.query(events, input)

  expect(actual).toStrictEqual(expected)
})
