import { describe, expect, it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/AcceptReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
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
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC456'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000061'),
    reviewRequestId,
  })

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    acceptedAt: fc.instant(),
    reviewRequestId: fc.uuid(),
  })

describe('foldState', () => {
  it.prop(
    'not received',
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
    ([[events, reviewRequestId]]) => {
      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(new _.NotReceived())
    },
    {
      fastCheck: {
        examples: [
          [[[], reviewRequestId]], // no events
          [[[reviewRequestForAPreprintWasAccepted], reviewRequestId]], // with events
          [[[otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // for other review request
        ],
      },
    },
  )

  it.prop(
    'not yet accepted',
    [
      fc
        .reviewRequestForAPreprintWasReceived()
        .map(received => Tuple.make(Array.of<ReviewRequests.ReviewRequestEvent>(received), received.reviewRequestId)),
    ],
    ([[events, reviewRequestId]]) => {
      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(new _.NotAccepted())
    },
    {
      fastCheck: {
        examples: [
          [[[reviewRequestForAPreprintWasReceived], reviewRequestId]], // not accepted
          [
            [
              [
                reviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasReceived,
                otherReviewRequestForAPreprintWasAccepted,
              ],
              reviewRequestId,
            ],
          ], // for other review request
        ],
      },
    },
  )

  it.prop(
    'already rejected',
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
    ([[events, reviewRequestId]]) => {
      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(new _.HasBeenRejected())
    },
    {
      fastCheck: {
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
    },
  )

  it.prop(
    'already accepted',
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
    ([[events, reviewRequestId]]) => {
      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(new _.HasBeenAccepted())
    },
    {
      fastCheck: {
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
    },
  )
})

describe('decide', () => {
  it.prop('has not been received', [command()], ([command]) => {
    const result = _.decide(new _.NotReceived(), command)

    expect(result).toStrictEqual(Either.left(new ReviewRequests.UnknownReviewRequest({})))
  })

  it.prop('has not been accepted', [command()], ([command]) => {
    const result = _.decide(new _.NotAccepted(), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
            acceptedAt: command.acceptedAt,
            reviewRequestId: command.reviewRequestId,
          }),
        ),
      ),
    )
  })

  it.prop('has already been rejected', [command()], ([command]) => {
    const result = _.decide(new _.HasBeenRejected(), command)

    expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestHasBeenRejected({})))
  })

  it.prop('has already been accepted', [command()], ([command]) => {
    const result = _.decide(new _.HasBeenAccepted(), command)

    expect(result).toStrictEqual(Either.right(Option.none()))
  })
})
