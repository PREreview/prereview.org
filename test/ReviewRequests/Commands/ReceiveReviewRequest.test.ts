import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/ReceiveReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
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
    preprintId: fc.indeterminatePreprintId(),
    reviewRequestId: fc.uuid(),
    requester: fc.record({
      name: fc.nonEmptyString(),
      orcidId: fc.option(fc.orcidId(), { nil: undefined }),
      sciProfilesId: fc.option(fc.sciProfilesId(), { nil: undefined }),
      emailAddress: fc.option(fc.emailAddress(), { nil: undefined }),
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
        [[[otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // for other review request
      ],
    },
  )('not yet received', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotReceived())
  })

  test.prop(
    [
      fc
        .reviewRequestForAPreprintWasReceived()
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasReceived], reviewRequestId]], // was received
        [
          [
            [reviewRequestForAPreprintWasReceived, reviewRequestForAPreprintWasSharedOnTheCommunitySlack],
            reviewRequestId,
          ],
        ], // other events
        [[[reviewRequestForAPreprintWasReceived, otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // other review request too
      ],
    },
  )('already received', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.HasBeenReceived())
  })
})

describe('decide', () => {
  test.prop([command()])('has not been received', command => {
    const result = _.decide(new _.NotReceived(), command)

    expect(result).toStrictEqual(
      Option.some(
        new ReviewRequests.ReviewRequestForAPreprintWasReceived({
          receivedAt: command.receivedAt,
          preprintId: command.preprintId,
          reviewRequestId: command.reviewRequestId,
          requester: Option.some(command.requester),
        }),
      ),
    )
  })

  test.prop([command()])('has already been received', command => {
    const result = _.decide(new _.HasBeenReceived(), command)

    expect(result).toStrictEqual(Option.none())
  })
})
