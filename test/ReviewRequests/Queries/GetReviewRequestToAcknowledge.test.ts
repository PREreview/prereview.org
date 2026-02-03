import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Predicate, Tuple } from 'effect'
import type * as Events from '../../../src/Events.ts'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetReviewRequestToAcknowledge.ts'
import { Doi, EmailAddress, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived1 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
    emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
  }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasReceived2 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({
    name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul'),
    emailAddress: EmailAddress.EmailAddress('jbbotul@example.com'),
  }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasReceived3 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Arne Saknussemm') }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasReceived4 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.none(),
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
const emailToAcknowledgeAReviewRequestForAPreprintWasSent =
  new ReviewRequests.EmailToAcknowledgeAReviewRequestForAPreprintWasSent({
    sentAt: Temporal.Now.instant().subtract({ minutes: 5 }),
    reviewRequestId,
  })
const otherReviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
})
const otherEmailToAcknowledgeAReviewRequestForAPreprintWasSent =
  new ReviewRequests.EmailToAcknowledgeAReviewRequestForAPreprintWasSent({
    sentAt: Temporal.Now.instant().subtract({ minutes: 5 }),
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

describe('GetReviewRequestToAcknowledge', () => {
  test.prop<[Array<Events.Event>, Uuid.Uuid]>(
    [fc.array(fc.event().filter(Predicate.not(Predicate.isTagged('ReviewRequestForAPreprintWasReceived')))), fc.uuid()],
    {
      examples: [
        [[], reviewRequestId], // no events
        [[reviewRequestForAPreprintWasAccepted1, emailToAcknowledgeAReviewRequestForAPreprintWasSent], reviewRequestId], // with events
        [[otherReviewRequestForAPreprintWasReceived], reviewRequestId], // with events for other dataset review
      ],
    },
  )('not received', (events, reviewRequestId) => {
    const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })

  test.prop<[[Array.NonEmptyArray<Events.Event>, Uuid.Uuid]]>(
    [
      fc
        .tuple(
          fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.reviewRequestForAPreprintWasRejected({ reviewRequestId: fc.constant(reviewRequestId) }),
        )
        .map(([received, rejected]) => Tuple.make(Array.make(received, rejected), reviewRequestId)),
    ],
    {
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
              emailToAcknowledgeAReviewRequestForAPreprintWasSent,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasAccepted,
            ],
            reviewRequestId,
          ],
        ], // other requests
      ],
    },
  )('has been rejected', ([events, reviewRequestId]) => {
    const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenRejected({})))
  })

  test.prop<[[Array.NonEmptyArray<Events.Event>, Uuid.Uuid]]>(
    [
      fc
        .reviewRequestForAPreprintWasReceived()
        .map(received => Tuple.make(Array.make(received), received.reviewRequestId)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasReceived1], reviewRequestForAPreprintWasReceived1.reviewRequestId]], // was received
        [
          [
            [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasReceived2],
            reviewRequestForAPreprintWasReceived2.reviewRequestId,
          ],
        ], // multiple times
        [
          [
            [
              reviewRequestForAPreprintWasReceived1,
              reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
              emailToAcknowledgeAReviewRequestForAPreprintWasSent,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasRejected,
            ],
            reviewRequestForAPreprintWasReceived1.reviewRequestId,
          ],
        ], // with other events
      ],
    },
  )('not accepted or rejected', ([events, reviewRequestId]) => {
    const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasNotBeenAccepted({})))
  })

  test.prop<[[Array.NonEmptyArray<Events.Event>, Uuid.Uuid]]>(
    [
      fc
        .tuple(
          fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.emailToAcknowledgeAReviewRequestForAPreprintWasSent({ reviewRequestId: fc.constant(reviewRequestId) }),
        )
        .map(([received, accepted, sent]) => Tuple.make(Array.make(received, accepted, sent), reviewRequestId)),
    ],
    {
      examples: [
        [
          [
            [
              reviewRequestForAPreprintWasReceived1,
              reviewRequestForAPreprintWasAccepted1,
              emailToAcknowledgeAReviewRequestForAPreprintWasSent,
            ],
            reviewRequestId,
          ],
        ], // already sent
        [
          [
            [
              reviewRequestForAPreprintWasReceived1,
              reviewRequestForAPreprintWasAccepted1,
              emailToAcknowledgeAReviewRequestForAPreprintWasSent,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasAccepted,
            ],
            reviewRequestId,
          ],
        ], // other requests
      ],
    },
  )('already sent', ([events, reviewRequestId]) => {
    const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadyAcknowledged({})))
  })

  describe('not yet sent', () => {
    test.prop<[[Array.NonEmptyArray<Events.Event>, Uuid.Uuid]]>(
      [
        fc
          .tuple(
            fc.reviewRequestForAPreprintWasReceived({
              reviewRequestId: fc.constant(reviewRequestId),
              requester: fc.maybe(fc.record({ name: fc.nonEmptyString() })),
            }),
            fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
          )
          .map(([received, accepted]) => Tuple.make(Array.make(received, accepted), reviewRequestId)),
      ],
      {
        examples: [
          [[[reviewRequestForAPreprintWasReceived3, reviewRequestForAPreprintWasAccepted1], reviewRequestId]], // without an email address
          [[[reviewRequestForAPreprintWasReceived4, reviewRequestForAPreprintWasAccepted1], reviewRequestId]], // without a requester
          [
            [
              [
                reviewRequestForAPreprintWasAccepted1,
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasAccepted2,
                reviewRequestForAPreprintWasReceived3,
              ],
              reviewRequestId,
            ],
          ], // multiple times
          [
            [
              [
                reviewRequestForAPreprintWasReceived3,
                reviewRequestForAPreprintWasAccepted1,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasAccepted,
                otherEmailToAcknowledgeAReviewRequestForAPreprintWasSent,
              ],
              reviewRequestId,
            ],
          ], // other requests
        ],
      },
    )('cannot contact', ([events, reviewRequestId]) => {
      const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestCannotBeAcknowledged({})))
    })

    test.prop<[[Array.NonEmptyArray<Events.Event>, Uuid.Uuid, _.ReviewRequestToAcknowledge]]>(
      [
        fc
          .record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })
          .chain(requester =>
            fc.tuple(
              fc.constant(requester),
              fc.reviewRequestForAPreprintWasReceived({
                reviewRequestId: fc.constant(reviewRequestId),
                requester: fc.some(fc.constant(requester)),
              }),
              fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
            ),
          )
          .map(([requester, received, accepted]) =>
            Tuple.make(Array.make(received, accepted), reviewRequestId, { requester }),
          ),
      ],
      {
        examples: [
          [
            [
              [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasAccepted1],
              reviewRequestId,
              {
                requester: {
                  name: NonEmptyString.NonEmptyString('Josiah Carberry'),
                  emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
                },
              },
            ],
          ], // accepted
          [
            [
              [
                reviewRequestForAPreprintWasAccepted1,
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasAccepted2,
                reviewRequestForAPreprintWasReceived2,
              ],
              reviewRequestId,
              {
                requester: {
                  name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul'),
                  emailAddress: EmailAddress.EmailAddress('jbbotul@example.com'),
                },
              },
            ],
          ], // multiple times
          [
            [
              [
                reviewRequestForAPreprintWasReceived1,
                reviewRequestForAPreprintWasAccepted1,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasAccepted,
                otherEmailToAcknowledgeAReviewRequestForAPreprintWasSent,
              ],
              reviewRequestId,
              {
                requester: {
                  name: NonEmptyString.NonEmptyString('Josiah Carberry'),
                  emailAddress: EmailAddress.EmailAddress('jcarberry@example.com'),
                },
              },
            ],
          ], // other requests
        ],
      },
    )('can contact', ([events, reviewRequestId, expected]) => {
      const actual = _.GetReviewRequestToAcknowledge.query(events, { reviewRequestId })

      expect(actual).toStrictEqual(Either.right(expected))
    })
  })
})
