import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either } from 'effect'
import * as Events from '../../../src/Events.ts'
import { BiorxivOrMedrxivPreprintId, BiorxivPreprintId } from '../../../src/Preprints/PreprintId.ts'
import { ReviewRequestHasBeenPublished, UnknownReviewRequest } from '../../../src/ReviewRequests/Errors.ts'
import * as _ from '../../../src/ReviewRequests/Queries/DoesAReviewRequestNeedADecisionOnReviewNotifications.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const preprintDoi = Doi('10.1101/2023.01.01.123456')

const input = {
  requesterId: OrcidId('0000-0002-1825-0097'),
  preprintId: new BiorxivPreprintId({ value: preprintDoi }),
} satisfies _.Input

const requestImported = new Events.ReviewRequestByAPrereviewerWasImported({
  reviewRequestId: Uuid('9cc25c8d-18eb-475d-8e66-9f0e8b94955e'),
  requester: { orcidId: input.requesterId, persona: 'public' },
  preprintId: input.preprintId,
  publishedAt: Temporal.Now.instant(),
})

const requestStarted = new Events.ReviewRequestForAPreprintWasStarted({
  reviewRequestId: Uuid('ea5920a6-46af-491e-bf18-aaa6770a2d09'),
  requesterId: input.requesterId,
  preprintId: input.preprintId,
  startedAt: Temporal.Now.instant(),
})

const requestStartedWithIndeterminatePreprintId = new Events.ReviewRequestForAPreprintWasStarted({
  reviewRequestId: Uuid('8f019fe1-ad1b-4982-970a-5978deafe2bc'),
  requesterId: input.requesterId,
  preprintId: new BiorxivOrMedrxivPreprintId({ value: preprintDoi }),
  startedAt: Temporal.Now.instant(),
})

const requestPublished = new Events.ReviewRequestForAPreprintWasPublished({
  reviewRequestId: requestStarted.reviewRequestId,
  publishedAt: Temporal.Now.instant(),
})

const optedIn = new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.requesterId,
  optedInAt: Temporal.Now.instant(),
})

const optedOut = new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests({
  orcidId: input.requesterId,
  optedOutAt: Temporal.Now.instant(),
})

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Either.left(new UnknownReviewRequest({}))],
  ['request imported', [requestImported], Either.left(new ReviewRequestHasBeenPublished({}))],
  ['request published', [requestStarted, requestPublished], Either.left(new ReviewRequestHasBeenPublished({}))],
  ['request started, no decision', [requestStarted], Either.right(true)],
  [
    'request started with indeterminate preprint ID, no decision',
    [requestStartedWithIndeterminatePreprintId],
    Either.right(true),
  ],
  ['request started, opted-in', [requestStarted, optedIn], Either.right(false)],
  ['request started, opted-out', [requestStarted, optedOut], Either.right(false)],
  ['request started, opted-in and out', [requestStarted, optedIn, optedOut], Either.right(false)],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.DoesAReviewRequestNeedADecisionOnReviewNotifications

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
