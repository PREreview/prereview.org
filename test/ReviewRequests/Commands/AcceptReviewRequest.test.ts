import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/AcceptReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  receivedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId,
  requester: { name: NonEmptyString.NonEmptyString('Josiah Carberry') },
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

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    receivedAt: fc.instant(),
    acceptedAt: fc.instant(),
    preprintId: fc.preprintId(),
    reviewRequestId: fc.uuid(),
    requester: fc.record({
      name: fc.nonEmptyString(),
    }),
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
        [[[reviewRequestForAPreprintWasSharedOnTheCommunitySlack], reviewRequestId]], // with events
        [[[otherReviewRequestForAPreprintWasAccepted], reviewRequestId]], // for other review request
      ],
    },
  )('not yet accepted', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotAccepted())
  })

  test.prop(
    [
      fc
        .reviewRequestForAPreprintWasAccepted()
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasAccepted], reviewRequestId]], // was accepted
        [
          [
            [reviewRequestForAPreprintWasAccepted, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
            reviewRequestId,
          ],
        ], // other events
        [[[reviewRequestForAPreprintWasAccepted, otherReviewRequestForAPreprintWasAccepted], reviewRequestId]], // other review request too
      ],
    },
  )('already accepted', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.HasBeenAccepted())
  })
})

describe('decide', () => {
  test.prop([command()])('has not been accepted', command => {
    const result = _.decide(new _.NotAccepted(), command)

    expect(result).toStrictEqual(
      Option.some(
        new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
          receivedAt: command.receivedAt,
          acceptedAt: command.acceptedAt,
          preprintId: command.preprintId,
          reviewRequestId: command.reviewRequestId,
          requester: command.requester,
        }),
      ),
    )
  })

  test.prop([command()])('has already been accepted', command => {
    const result = _.decide(new _.HasBeenAccepted(), command)

    expect(result).toStrictEqual(Option.none())
  })
})
