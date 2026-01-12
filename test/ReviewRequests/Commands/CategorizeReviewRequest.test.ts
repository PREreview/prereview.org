import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Equal, Option, Tuple } from 'effect'
import * as _ from '../../../src/ReviewRequests/Commands/CategorizeReviewRequest.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasCategorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  keywords: ['00010eef0ca8e2970fbb', '76f6c5435743d1f766a5'],
  topics: ['12520', '13393'],
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasCategorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  keywords: ['dac659f275925e65e3c7'],
  topics: ['14113'],
  reviewRequestId: otherReviewRequestId,
})

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    language: fc.languageCode(),
    keywords: fc.array(fc.keywordId()),
    topics: fc.array(fc.topicId()),
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
        [[[otherReviewRequestForAPreprintWasCategorized], reviewRequestId]], // for other review request
      ],
    },
  )('not yet categorized', ([events, reviewRequestId]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(new _.NotCategorized())
  })

  test.prop(
    [
      fc
        .reviewRequestForAPreprintWasCategorized()
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId, event)),
    ],
    {
      examples: [
        [[[reviewRequestForAPreprintWasCategorized], reviewRequestId, reviewRequestForAPreprintWasCategorized]], // was categorized
        [
          [
            [reviewRequestForAPreprintWasAccepted, reviewRequestForAPreprintWasCategorized],
            reviewRequestId,
            reviewRequestForAPreprintWasCategorized,
          ],
        ], // other events
        [
          [
            [reviewRequestForAPreprintWasCategorized, otherReviewRequestForAPreprintWasCategorized],
            reviewRequestId,
            reviewRequestForAPreprintWasCategorized,
          ],
        ], // other review request too
      ],
    },
  )('already categorized', ([events, reviewRequestId, categorized]) => {
    const state = _.foldState(events, reviewRequestId)

    expect(state).toStrictEqual(
      new _.HasBeenCategorized({
        language: categorized.language,
        keywords: categorized.keywords,
        topics: categorized.topics,
      }),
    )
  })
})

describe('decide', () => {
  test.prop([command()])('has not been categorized', command => {
    const result = _.decide(new _.NotCategorized(), command)

    expect(result).toStrictEqual(
      Either.right(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
            language: command.language,
            keywords: command.keywords,
            topics: command.topics,
            reviewRequestId: command.reviewRequestId,
          }),
        ),
      ),
    )
  })

  describe('has already been categorized', () => {
    test.prop([command()])('with the details', command => {
      const result = _.decide(
        new _.HasBeenCategorized({ language: command.language, keywords: command.keywords, topics: command.topics }),
        command,
      )

      expect(result).toStrictEqual(Either.right(Option.none()))
    })

    test.prop([
      fc.tuple(command(), fc.languageCode()).filter(([command, language]) => !Equal.equals(command.language, language)),
    ])('with a different language', ([command, language]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language, keywords: command.keywords, topics: command.topics }),
        command,
      )

      expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadyCategorized({})))
    })

    test.prop([
      fc
        .tuple(command(), fc.array(fc.keywordId()))
        .filter(([command, keywords]) => !Equal.equals(command.keywords, keywords)),
    ])('with different keywords', ([command, keywords]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language: command.language, keywords, topics: command.topics }),
        command,
      )

      expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadyCategorized({})))
    })

    test.prop([
      fc.tuple(command(), fc.array(fc.topicId())).filter(([command, topics]) => !Equal.equals(command.topics, topics)),
    ])('with different topics', ([command, topics]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language: command.language, keywords: command.keywords, topics }),
        command,
      )

      expect(result).toStrictEqual(Either.left(new ReviewRequests.ReviewRequestWasAlreadyCategorized({})))
    })
  })
})
