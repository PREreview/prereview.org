import { expect, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as _ from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReview/WasAReviewRequested.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as ReviewRequests from '../../../../src/Domain/ReviewRequests/index.ts'
import { Doi, Name, OrcidId, Uuid } from '../../../../src/types/index.ts'

const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const indeterminatePreprintId = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const otherPreprintId = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

const reviewPublished = Temporal.Instant.from('2026-11-10T14:00:00Z')
const reviewPublishedOn = Temporal.PlainDate.from('2026-11-10')

const requestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const started = new ReviewRequests.ReviewRequestForAPreprintWasStarted({
  startedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
  preprintId,
  requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
  reviewRequestId: requestId,
})

const publishedAt = (instant: string) =>
  new ReviewRequests.ReviewRequestForAPreprintWasPublished({
    publishedAt: Temporal.Instant.from(instant),
    reviewRequestId: requestId,
  })

const received = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: Name.Name('Josiah Carberry') }),
  reviewRequestId: requestId,
})

const accepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Instant.from('2026-11-02T09:00:00Z'),
  reviewRequestId: requestId,
})

const withdrawnAt = (instant: string) =>
  new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
    withdrawnAt: Temporal.Instant.from(instant),
    reviewRequestId: requestId,
    reason: 'requester-changed-their-mind',
  })

const otherRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

const otherRequestImported = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: Temporal.Instant.from('2026-11-03T09:00:00Z'),
  preprintId,
  requester: { orcidId: OrcidId.OrcidId('0000-0002-6109-0367'), persona: 'public' },
  reviewRequestId: otherRequestId,
})

const otherRequestWithdrawn = new ReviewRequests.ReviewRequestForAPreprintWasWithdrawn({
  withdrawnAt: Temporal.Instant.from('2026-11-04T09:00:00Z'),
  reviewRequestId: otherRequestId,
  reason: 'mistakenly-requested',
})

const importedFromAPrereviewer = new ReviewRequests.ReviewRequestByAPrereviewerWasImported({
  publishedAt: Temporal.Instant.from('2026-11-02T09:00:00Z'),
  preprintId,
  requester: { orcidId: OrcidId.OrcidId('0000-0002-1825-0097'), persona: 'public' },
  reviewRequestId: requestId,
})

const importedFromAPreprintServer = new ReviewRequests.ReviewRequestFromAPreprintServerWasImported({
  publishedAt: Temporal.Instant.from('2026-11-02T09:00:00Z'),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: Name.Name('Josiah Carberry') }),
  reviewRequestId: requestId,
})

test.each<[string, _.Input, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, _.Result]>([
  ['no events', { preprintId, published: reviewPublished }, [], false],
  [
    'requested by a PREreviewer before the review',
    { preprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z')],
    true,
  ],
  [
    'requested by a PREreviewer after the review',
    { preprintId, published: reviewPublished },
    [started, publishedAt('2026-11-10T15:00:00Z')],
    false,
  ],
  ['request started but not published', { preprintId, published: reviewPublished }, [started], false],
  [
    'requested by a preprint server before the review',
    { preprintId, published: reviewPublished },
    [received, accepted],
    true,
  ],
  ['received from a preprint server but not accepted', { preprintId, published: reviewPublished }, [received], false],
  ['imported request by a PREreviewer', { preprintId, published: reviewPublished }, [importedFromAPrereviewer], true],
  [
    'imported request from a preprint server',
    { preprintId, published: reviewPublished },
    [importedFromAPreprintServer],
    true,
  ],
  [
    'withdrawn before the review',
    { preprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z'), withdrawnAt('2026-11-10T13:00:00Z')],
    false,
  ],
  [
    'withdrawn after the review',
    { preprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z'), withdrawnAt('2026-11-10T15:00:00Z')],
    true,
  ],
  [
    'one of several requests withdrawn before the review',
    { preprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z'), withdrawnAt('2026-11-10T13:00:00Z'), otherRequestImported],
    true,
  ],
  [
    'all of several requests withdrawn before the review',
    { preprintId, published: reviewPublished },
    [
      started,
      publishedAt('2026-11-02T09:00:00Z'),
      withdrawnAt('2026-11-10T13:00:00Z'),
      otherRequestImported,
      otherRequestWithdrawn,
    ],
    false,
  ],
  [
    'requested for a different preprint',
    { preprintId: otherPreprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z')],
    false,
  ],
  [
    'requested for the same preprint with an indeterminate ID',
    { preprintId: indeterminatePreprintId, published: reviewPublished },
    [started, publishedAt('2026-11-02T09:00:00Z')],
    true,
  ],
  [
    'requested on the same day as a date-only review',
    { preprintId, published: reviewPublishedOn },
    [started, publishedAt('2026-11-10T23:00:00Z')],
    true,
  ],
  [
    'requested the day after a date-only review',
    { preprintId, published: reviewPublishedOn },
    [started, publishedAt('2026-11-11T01:00:00Z')],
    false,
  ],
  [
    'withdrawn on the same day as a date-only review',
    { preprintId, published: reviewPublishedOn },
    [started, publishedAt('2026-11-02T09:00:00Z'), withdrawnAt('2026-11-10T01:00:00Z')],
    true,
  ],
  [
    'withdrawn the day before a date-only review',
    { preprintId, published: reviewPublishedOn },
    [started, publishedAt('2026-11-02T09:00:00Z'), withdrawnAt('2026-11-09T23:00:00Z')],
    false,
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.WasAReviewRequested

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Result.succeed(expected))
})
