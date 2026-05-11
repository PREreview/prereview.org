import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array } from 'effect'
import type * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/ListPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const prereviewer1 = OrcidId.OrcidId('0000-0002-1825-0097')
const prereviewer2 = OrcidId.OrcidId('0000-0002-6109-0367')

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId1Indeterminate = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const now = Temporal.Now.instant()

const request1Started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: prereviewer1,
  reviewRequestId: request1Id,
})
const request1OptedIn = new ReviewRequests.PrereviewerOptedInToNotificationsForReviewsOfAPreprint({
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
const request2Started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 1 }),
  preprintId: preprintId1,
  requesterId: prereviewer1,
  reviewRequestId: request2Id,
})
const request2StartedOtherPrereviewer = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  ...request2Started,
  requesterId: prereviewer2,
})
const request2OptedIn = new ReviewRequests.PrereviewerOptedInToNotificationsForReviewsOfAPreprint({
  reviewRequestId: request2Id,
})
const request2Published = new ReviewRequests.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request2Id,
})

test.fails.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', preprintId1, [], []],
  ['not published', preprintId1, [request1Started], []],
  ['published not opted-in', preprintId1, [request1Started, request1Published], []],
  ['published opted-in', preprintId1, [request1Started, request1OptedIn, request1Published], [prereviewer1]],
  [
    'published opted-in, indeterminate ID',
    preprintId1Indeterminate,
    [request1Started, request1OptedIn, request1Published],
    [prereviewer1],
  ],
  [
    'published opted-in but withdrawn',
    preprintId1,
    [request1Started, request1OptedIn, request1Published, request1Withdrawn],
    [],
  ],
  [
    'published opted-in multiple times',
    preprintId1,
    [
      request1Started,
      request1OptedIn,
      request1Published,
      request2StartedOtherPrereviewer,
      request2OptedIn,
      request2Published,
    ],
    [prereviewer1, prereviewer2],
  ],
  [
    'published opted-in multiple times, same PREreviewer',
    preprintId1,
    [request1Started, request1OptedIn, request1Published, request2Started, request2OptedIn, request2Published],
    [prereviewer1],
  ],
  ['published opted-in, different preprint', preprintId2, [request1Started, request1OptedIn, request1Published], []],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } =
    _.ListPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
