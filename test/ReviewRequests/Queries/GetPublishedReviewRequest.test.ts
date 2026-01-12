import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Predicate, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/GetPublishedReviewRequest.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived1 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId,
})
const reviewRequestForAPreprintWasReceived2 = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul') },
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasAccepted1 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId,
})
const reviewRequestForAPreprintWasAccepted2 = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ minutes: 10 }),
  receivedAt: Temporal.Now.instant().subtract({ minutes: 20 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul') },
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC456'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000061'),
    reviewRequestId,
  })

describe('query', () => {
  test.prop(
    [
      fc.array(
        fc.reviewRequestEvent().filter(Predicate.not(Predicate.isTagged('ReviewRequestForAPreprintWasReceived'))),
      ),
      fc.uuid(),
    ],
    {
      examples: [
        [[], reviewRequestId], // no events
        [
          [reviewRequestForAPreprintWasAccepted1, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
          reviewRequestId,
        ], // with events
        [[otherReviewRequestForAPreprintWasReceived], reviewRequestId], // with events for other dataset review
      ],
    },
  )('not received', (events, reviewRequestId) => {
    const actual = _.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })

  test.prop(
    [
      fc.array(
        fc.reviewRequestEvent().filter(Predicate.not(Predicate.isTagged('ReviewRequestForAPreprintWasAccepted'))),
      ),
      fc.uuid(),
    ],
    {
      examples: [
        [
          [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
          reviewRequestId,
        ], // with events
        [[otherReviewRequestForAPreprintWasReceived, otherReviewRequestForAPreprintWasAccepted], reviewRequestId], // with events for other dataset review
      ],
    },
  )('not accepted', (events, reviewRequestId) => {
    const actual = _.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })

  test.prop(
    [
      fc
        .tuple(
          fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
          fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
        )
        .map(([received, accepted]) =>
          Tuple.make(Array.make(received, accepted), reviewRequestId, Tuple.make(received, accepted)),
        ),
    ],
    {
      examples: [
        [
          [
            [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasAccepted1],
            reviewRequestId,
            [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasAccepted1],
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
            [reviewRequestForAPreprintWasReceived2, reviewRequestForAPreprintWasAccepted2],
          ],
        ], // multiple times
        [
          [
            [
              reviewRequestForAPreprintWasReceived1,
              reviewRequestForAPreprintWasAccepted1,
              otherReviewRequestForAPreprintWasAccepted,
            ],
            reviewRequestId,
            [reviewRequestForAPreprintWasReceived1, reviewRequestForAPreprintWasAccepted1],
          ],
        ], // other requests
      ],
    },
  )('has been accepted', ([events, reviewRequestId, expected]) => {
    const actual = _.query(events, { reviewRequestId })

    expect(actual).toStrictEqual(
      Either.right({
        author: expected[0].requester,
        preprintId: expected[0].preprintId,
        id: expected[0].reviewRequestId,
        published: expected[1].acceptedAt,
      }),
    )
  })
})
