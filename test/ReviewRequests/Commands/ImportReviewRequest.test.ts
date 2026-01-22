import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Equal, Option, Tuple } from 'effect'
import { Slack } from '../../../src/ExternalApis/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/ReviewRequests/Commands/ImportReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const preprintId = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const reviewRequestForAPreprintWasImported = new ReviewRequests.ReviewRequestForAPreprintWasImported({
  publishedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasImported = new ReviewRequests.ReviewRequestForAPreprintWasImported({
  publishedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId: otherReviewRequestId,
})
const reviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  receivedFrom: new URL('http://example.com'),
  preprintId,
  requester: Option.some({ name: NonEmptyString.NonEmptyString('Josiah Carberry') }),
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasReceived = new ReviewRequests.ReviewRequestForAPreprintWasReceived({
  receivedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  receivedFrom: new URL('http://example.com'),
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
    publishedAt: fc.instant(),
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
        [[[otherReviewRequestForAPreprintWasImported], reviewRequestId]], // for other review request
        [[[otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // for other received review request
      ],
    },
  )('not yet imported', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotImported())
  })

  test.prop(
    [
      fc
        .oneof(fc.reviewRequestForAPreprintWasImported(), fc.reviewRequestForAPreprintWasImported())
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasImported], reviewRequestId]], // was imported
        [[[reviewRequestForAPreprintWasReceived], reviewRequestId]], // was recevied
        [
          [
            [
              reviewRequestForAPreprintWasImported,
              reviewRequestForAPreprintWasReceived,
              reviewRequestForAPreprintWasSharedOnTheCommunitySlack,
            ],
            reviewRequestId,
          ],
        ], // other events
        [[[reviewRequestForAPreprintWasImported, otherReviewRequestForAPreprintWasReceived], reviewRequestId]], // other review request too
      ],
    },
  )('already imported', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.HasBeenImported())
  })
})

describe('decide', () => {
  test.prop([command()])('has not been imported', command => {
    const result = _.decide(new _.NotImported(), command)

    expect(result).toStrictEqual(
      Option.some(
        new ReviewRequests.ReviewRequestForAPreprintWasImported({
          publishedAt: command.publishedAt,
          preprintId: command.preprintId,
          reviewRequestId: command.reviewRequestId,
          requester: Option.some(command.requester),
        }),
      ),
    )
  })

  test.prop([command()])('has already been imported', command => {
    const result = _.decide(new _.HasBeenImported(), command)

    expect(result).toStrictEqual(Option.none())
  })
})
