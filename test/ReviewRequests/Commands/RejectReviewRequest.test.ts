import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/RejectReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasRejected = new ReviewRequests.ReviewRequestForAPreprintWasRejected({
  rejectedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
  reason: 'not-a-preprint',
})
const otherReviewRequestForAPreprintWasRejected = new ReviewRequests.ReviewRequestForAPreprintWasRejected({
  rejectedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
  reason: 'unknown-preprint',
})
const reviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC456'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000061'),
    reviewRequestId,
  })

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    rejectedAt: fc.instant(),
    reviewRequestId: fc.uuid(),
    reason: fc.constantFrom('not-a-preprint', 'unknown-preprint'),
  })

describe('foldState', () => {
  test.prop(
    [
      fc
        .uuid()
        .chain(reviewRequestId =>
          fc.tuple(
            fc.array(fc.reviewRequestEvent().filter(event => !Equal.equals(event.reviewRequestId, reviewRequestId))),
            fc.constant(reviewRequestId),
          ),
        ),
    ],
    {
      examples: [
        [[[], reviewRequestId]], // no events
        [[[reviewRequestForAPreprintWasRejected], reviewRequestId]], // with events
        [[[otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // for other review request
      ],
    },
  )('not received', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotReceived())
  })

  test.prop(
    [
      fc
        .reviewRequestForAPreprintWasReceived()
        .map(received => Tuple.make(Array.of<ReviewRequests.ReviewRequestEvent>(received), received.reviewRequestId)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasReceived], reviewRequestId]], // not rejected
        [
          [
            [
              reviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasRejected,
            ],
            reviewRequestId,
          ],
        ], // for other review request
      ],
    },
  )('not yet rejected', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotRejected())
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(reviewRequestId =>
          fc
            .tuple(
              fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
              fc.reviewRequestForAPreprintWasAccepted({ reviewRequestId: fc.constant(reviewRequestId) }),
            )
            .map(events =>
              Tuple.make(
                Array.make<Array.NonEmptyArray<ReviewRequests.ReviewRequestEvent>>(...events),
                events[0].reviewRequestId,
              ),
            ),
        ),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasReceived, reviewRequestForAPreprintWasAccepted], reviewRequestId]], // was accepted
        [
          [
            [
              reviewRequestForAPreprintWasReceived,
              reviewRequestForAPreprintWasAccepted,
              reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
            ],
            reviewRequestId,
          ],
        ], // other events
        [
          [
            [
              reviewRequestForAPreprintWasReceived,
              reviewRequestForAPreprintWasAccepted,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasAccepted,
            ],
            reviewRequestId,
          ],
        ], // other review request too
      ],
    },
  )('already accepted', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.HasBeenAccepted())
  })

  test.prop(
    [
      fc
        .uuid()
        .chain(reviewRequestId =>
          fc
            .tuple(
              fc.reviewRequestForAPreprintWasReceived({ reviewRequestId: fc.constant(reviewRequestId) }),
              fc.reviewRequestForAPreprintWasRejected({ reviewRequestId: fc.constant(reviewRequestId) }),
            )
            .map(events =>
              Tuple.make(
                Array.make<Array.NonEmptyArray<ReviewRequests.ReviewRequestEvent>>(...events),
                events[0].reviewRequestId,
              ),
            ),
        ),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasReceived, reviewRequestForAPreprintWasRejected], reviewRequestId]], // was rejected
        [
          [
            [
              reviewRequestForAPreprintWasReceived,
              reviewRequestForAPreprintWasRejected,
              reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
            ],
            reviewRequestId,
          ],
        ], // other events
        [
          [
            [
              reviewRequestForAPreprintWasReceived,
              reviewRequestForAPreprintWasRejected,
              otherReviewRequestForAPreprintWasReceived,
              otherReviewRequestForAPreprintWasRejected,
            ],
            reviewRequestId,
          ],
        ], // other review request too
      ],
    },
  )('already rejected', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.HasBeenRejected())
  })
})

describe('decide', () => {
  test.prop([command()])('has not been received', command => {
    const result = _.decide(new _.NotReceived(), command)

    expect(result).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })

  test.prop([command()])('has not been rejected', command => {
    const result = _.decide(new _.NotRejected(), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasRejected({
            rejectedAt: command.rejectedAt,
            reviewRequestId: command.reviewRequestId,
            reason: command.reason,
          }),
        ),
      ),
    )
  })

  test.prop([command()])('has already been accepted', command => {
    const result = _.decide(new _.HasBeenAccepted(), command)

    expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenAccepted({})))
  })

  test.prop([command()])('has already been rejected', command => {
    const result = _.decide(new _.HasBeenRejected(), command)

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})
