import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import { expect } from 'vitest'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/ListAllPublishedReviewRequestsByAPrereviewer.ts'
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
const request1Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  keywords: ['bc372b08bff50a48358e', 'd164de1eaf4ecfbd8833'],
  topics: ['13741', '12422'],
  reviewRequestId: request1Id,
})
const request1Published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request2Imported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 8 }),
  preprintId: preprintId2,
  requester: { orcidId: requesterId1, persona: 'public' },
  reviewRequestId: request2Id,
})

test.each<[string, _.Input, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', { requesterId: requesterId1 }, [], []],
  ['only pending publication', { requesterId: requesterId1 }, [request1Started], []],
  [
    'published request',
    { requesterId: requesterId1 },
    [request1Started, request1Published],
    [
      {
        published: request1Published.publishedAt,
        subfields: [],
        preprintId: request1Started.preprintId,
      },
    ],
  ],
  ['different requester ID', { requesterId: requesterId2 }, [request1Started, request1Published], []],
  [
    'multiple published requests',
    { requesterId: requesterId1 },
    [request1Started, request1Categorized, request1Published, request2Imported],
    [
      {
        published: request1Published.publishedAt,
        subfields: ['3314', '2741'],
        preprintId: request1Started.preprintId,
      },
      {
        published: request2Imported.publishedAt,
        subfields: [],
        preprintId: request2Imported.preprintId,
      },
    ],
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListAllPublishedReviewRequestsByAPrereviewer

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
