import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, HashSet } from 'effect'
import * as Events from '../../../src/Events.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications.ts'
import { Doi, OrcidId, Uuid } from '../../../src/types/index.ts'

const prereviewer1 = OrcidId.OrcidId('0000-0002-1825-0097')
const prereviewer2 = OrcidId.OrcidId('0000-0002-6109-0367')

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId1Indeterminate = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const now = Temporal.Now.instant()

const request1Started = new Events.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requesterId: prereviewer1,
  reviewRequestId: request1Id,
})
const request1Published = new Events.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request1Id,
})
const request1Withdrawn = new Events.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: now.subtract({ minutes: 10 }),
  reviewRequestId: request1Id,
  reason: 'preprint-withdrawn-from-preprint-server',
})
const request1Imported = new Events.ReviewRequestByAPrereviewerWasImported({
  publishedAt: now.subtract({ hours: 1 }),
  preprintId: preprintId1,
  requester: { orcidId: prereviewer1, persona: 'public' },
  reviewRequestId: request1Id,
})
const request2Started = new Events.ReviewRequestForAPreprintWasStarted({
  startedAt: now.subtract({ hours: 1 }),
  preprintId: preprintId1,
  requesterId: prereviewer2,
  reviewRequestId: request2Id,
})
const request2Published = new Events.ReviewRequestForAPreprintWasPublished({
  publishedAt: now.subtract({ hours: 1 }),
  reviewRequestId: request2Id,
})
const prereviewer1OptedIn = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: prereviewer1,
  optedInAt: now.subtract({ hours: 1 }),
})
const prereviewer1OptedOut = new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: prereviewer1,
  optedOutAt: now.subtract({ minutes: 30 }),
})
const prereviewer1OptedInAgain =
  new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
    orcidId: prereviewer1,
    optedInAt: now.subtract({ minutes: 10 }),
  })
const prereviewer2OptedIn = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: prereviewer2,
  optedInAt: now.subtract({ hours: 1 }),
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', preprintId1, [], HashSet.empty()],
  ['not published', preprintId1, [request1Started], HashSet.empty()],
  ['published not opted-in', preprintId1, [request1Started, request1Published], HashSet.empty()],
  ['imported not opted-in', preprintId1, [request1Imported], HashSet.empty()],
  [
    'published opted-in',
    preprintId1,
    [request1Started, prereviewer1OptedIn, request1Published],
    HashSet.make(prereviewer1),
  ],
  [
    'published opted-out',
    preprintId1,
    [request1Started, prereviewer1OptedIn, prereviewer1OptedOut, request1Published],
    HashSet.empty(),
  ],
  [
    'published opted-in again',
    preprintId1,
    [request1Started, prereviewer1OptedIn, prereviewer1OptedOut, prereviewer1OptedInAgain, request1Published],
    HashSet.make(prereviewer1),
  ],
  ['imported opted-in', preprintId1, [request1Imported, prereviewer1OptedIn], HashSet.make(prereviewer1)],
  ['imported opted-out', preprintId1, [request1Imported, prereviewer1OptedIn, prereviewer1OptedOut], HashSet.empty()],
  [
    'imported opted-in again',
    preprintId1,
    [request1Imported, prereviewer1OptedIn, prereviewer1OptedOut, prereviewer1OptedInAgain],
    HashSet.make(prereviewer1),
  ],
  [
    'published opted-in, indeterminate ID',
    preprintId1Indeterminate,
    [request1Started, prereviewer1OptedIn, request1Published],
    HashSet.make(prereviewer1),
  ],
  [
    'imported opted-in, indeterminate ID',
    preprintId1Indeterminate,
    [request1Imported, prereviewer1OptedIn],
    HashSet.make(prereviewer1),
  ],
  [
    'published opted-in but withdrawn',
    preprintId1,
    [request1Started, prereviewer1OptedIn, request1Published, request1Withdrawn],
    HashSet.empty(),
  ],
  [
    'imported opted-in but withdrawn',
    preprintId1,
    [request1Imported, prereviewer1OptedIn, request1Withdrawn],
    HashSet.empty(),
  ],
  [
    'published opted-in multiple times',
    preprintId1,
    [request1Started, prereviewer1OptedIn, request1Published, request2Started, prereviewer2OptedIn, request2Published],
    HashSet.make(prereviewer1, prereviewer2),
  ],
  [
    'published opted-in, different preprint',
    preprintId2,
    [request1Started, prereviewer1OptedIn, request1Published],
    HashSet.empty(),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } =
    _.ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Either.right(expected))
})
