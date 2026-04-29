import { it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import { describe, expect } from 'vitest'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetReceivedReviewRequest.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived1 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasReceived2 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul') }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasAccepted1 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasAccepted2 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ minutes: 10 }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasRejected1 = new ReviewRequests.ReviewRequestForAPreprintWasRejected({
  rejectedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
  reason: 'not-a-preprint',
})
const reviewRequestForAPreprintWasRejected2 = new ReviewRequests.ReviewRequestForAPreprintWasRejected({
  rejectedAt: Temporal.Now.instant().subtract({ minutes: 10 }),
  reviewRequestId,
  reason: 'unknown-preprint',
})
const otherReviewRequestForAPreprintWasRejected = new ReviewRequests.ReviewRequestForAPreprintWasRejected({
  rejectedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
  reason: 'not-a-preprint',
})
const reviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC456'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000061'),
    reviewRequestId,
  })

describe('GetReceivedReviewRequest', () => {
  it.prop(
    'not received',
    [
      fc.array(
        fc.reviewRequestEvent().filter(Predicate.not(Predicate.isTagged('ReviewRequestForAPreprintWasReceived'))),
      ),
      fc.uuid(),
    ],
    ([events, reviewRequestId]) => {
      const actual = _.GetReceivedReviewRequest.query(events, { reviewRequestId })

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
    },
    {
      fastCheck: {
        examples: [
          [[], reviewRequestId], // no events
          [
            [reviewRequestForAPreprintWasAccepted1, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
            reviewRequestId,
          ], // with events
          [[otherReviewRequestForAPreprintWasReceived], reviewRequestId], // with events for other dataset review
        ],
      },
    },
  )

  it.prop(
    'has been accepted',
    [
      fc
        .tuple(
          fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
        )
        .map(([received, accepted]) =>
          Tuple.make(Array.make(received, accepted as ReviewRequests.ReviewRequestEvent), reviewRequestId),
        ),
    ],
    ([[events, reviewRequestId]]) => {
      const actual = _.GetReceivedReviewRequest.query(events, { reviewRequestId })

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenAccepted({})))
    },
    {
      fastCheck: {
        examples: [
          [[[reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasAccepted1], reviewRequestId]], // accepted
          [
            [
              [
                reviewRequestForAPreprintWasAccepted1,
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasAccepted2,
                reviewRequestForAPreprintWasReceived2,
              ],
              reviewRequestId,
            ],
          ], // multiple times
          [
            [
              [
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasAccepted1,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasRejected,
              ],
              reviewRequestId,
            ],
          ], // other requests
        ],
      },
    },
  )

  it.prop(
    'has been rejected',
    [
      fc
        .tuple(
          fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.reviewRequestForAPreprintWasRejected({ reviewRequestId: fc.constant(reviewRequestId) }),
        )
        .map(([received, rejected]) =>
          Tuple.make(Array.make(received, rejected as ReviewRequests.ReviewRequestEvent), reviewRequestId),
        ),
    ],
    ([[events, reviewRequestId]]) => {
      const actual = _.GetReceivedReviewRequest.query(events, { reviewRequestId })

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenRejected({})))
    },
    {
      fastCheck: {
        examples: [
          [[[reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasRejected1], reviewRequestId]], // rejected
          [
            [
              [
                reviewRequestForAPreprintWasRejected1,
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasRejected2,
                reviewRequestForAPreprintWasReceived2,
              ],
              reviewRequestId,
            ],
          ], // multiple times
          [
            [
              [
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasRejected1,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasAccepted,
              ],
              reviewRequestId,
            ],
          ], // other requests
        ],
      },
    },
  )

  it.prop(
    'not accepted or rejected',
    [
      fc.reviewRequestForAPreprintWasReceived().map(received =>
        Tuple.make(Array.make(received as ReviewRequests.ReviewRequestEvent), {
          preprintId: received.preprintId,
          id: received.reviewRequestId,
        }),
      ),
    ],
    ([[events, expected]]) => {
      const actual = _.GetReceivedReviewRequest.query(events, { reviewRequestId: expected.id })

      expect(actual).toStrictEqual(Either.right(expected))
    },
    {
      fastCheck: {
        examples: [
          [
            [
              [reviewRequestForAPreprintWasReceived1],
              {
                preprintId: reviewRequestForAPreprintWasReceived1.preprintId,
                id: reviewRequestForAPreprintWasReceived1.reviewRequestId,
              },
            ],
          ], // was received
          [
            [
              [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasReceived2],
              {
                preprintId: reviewRequestForAPreprintWasReceived2.preprintId,
                id: reviewRequestForAPreprintWasReceived2.reviewRequestId,
              },
            ],
          ], // multiple times
          [
            [
              [
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasAccepted,
                otherReviewRequestForAPreprintWasReceived,
              ],
              {
                preprintId: reviewRequestForAPreprintWasReceived1.preprintId,
                id: reviewRequestForAPreprintWasReceived1.reviewRequestId,
              },
            ],
          ], // with other events
        ],
      },
    },
  )
})
