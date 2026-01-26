import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/RecordReviewRequestSharedOnTheCommunitySlack.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC456'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000061'),
    reviewRequestId,
  })
const otherReviewRequestForAPreprintWasSharedOnTheCommunitySlack =
  new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
    channelId: Slack.ChannelId.make('C123ABC442'),
    messageTimestamp: Slack.Timestamp.make('1401383885.000059'),
    reviewRequestId: otherReviewRequestId,
  })

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    channelId: fc.slackChannelId(),
    messageTimestamp: fc.slackTimestamp(),
    reviewRequestId: fc.uuid(),
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
        [[[reviewRequestForAPreprintWasAccepted], reviewRequestId]], // with events
        [[[otherReviewRequestForAPreprintWasSharedOnTheCommunitySlack], reviewRequestId]], // for other review request
      ],
    },
  )('not yet shared', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotShared())
  })

  test.prop(
    [
      fc
        .reviewRequestForAPreprintWasSharedOnTheCommunitySlack()
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId, event)),
    ],
    {
      examples: [
        [
          [
            [reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
            reviewRequestId,
            reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
          ],
        ], // was shared
        [
          [
            [reviewRequestForAPreprintWasAccepted, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
            reviewRequestId,
            reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
          ],
        ], // other events
        [
          [
            [
              reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
              otherReviewRequestForAPreprintWasSharedOnTheCommunitySlack,
            ],
            reviewRequestId,
            reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
          ],
        ], // other review request too
      ],
    },
  )('already shared', ([events, reviewRequestId, shared]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(
      new _.HasBeenShared({ channelId: shared.channelId, messageTimestamp: shared.messageTimestamp }),
    )
  })
})

describe('decide', () => {
  test.prop([command()])('has not been shared', command => {
    const result = _.decide(new _.NotShared(), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasSharedOnTheCommunitySlack({
            channelId: command.channelId,
            messageTimestamp: command.messageTimestamp,
            reviewRequestId: command.reviewRequestId,
          }),
        ),
      ),
    )
  })

  describe('has already been shared', () => {
    test.prop([command()])('with the same message', command => {
      const result = _.decide(
        new _.HasBeenShared({ channelId: command.channelId, messageTimestamp: command.messageTimestamp }),
        command,
      )

      expect(result).toStrictEqual(Either.right(Option.none()))
    })

    test.prop([
      fc
        .tuple(command(), fc.slackTimestamp())
        .filter(([command, timestamp]) => !Equal.equals(command.messageTimestamp, timestamp)),
    ])('with a different message', ([command, messageTimestamp]) => {
      const result = _.decide(new _.HasBeenShared({ channelId: command.channelId, messageTimestamp }), command)

      expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadySharedOnTheCommunitySlack({})))
    })

    test.prop([
      fc
        .tuple(command(), fc.slackChannelId())
        .filter(([command, channelId]) => !Equal.equals(command.channelId, channelId)),
    ])('on a different channel', ([command, channelId]) => {
      const result = _.decide(new _.HasBeenShared({ channelId, messageTimestamp: command.messageTimestamp }), command)

      expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadySharedOnTheCommunitySlack({})))
    })
  })
})
