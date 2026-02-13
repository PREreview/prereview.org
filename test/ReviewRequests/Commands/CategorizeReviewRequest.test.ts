import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Equal, Option, Tuple } from 'effect'
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

  describe('recategorized', () => {
    const categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
      language: 'es',
      keywords: ['00010eef0ca8e2970fbb', '76f6c5435743d1f766a5'],
      topics: ['12520', '13393'],
      reviewRequestId,
    })
    const recategorizedWithLanguage = new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
      language: 'pt',
      reviewRequestId,
    })
    const recategorizedWithKeywords = new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
      keywords: ['8e37b00f1a9ba4ac51ef'],
      reviewRequestId,
    })
    const recategorizedWithTopics = new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
      topics: ['10010'],
      reviewRequestId,
    })

    test('with language', () => {
      const events = [categorized, recategorizedWithLanguage]

      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(
        new _.HasBeenCategorized({
          language: recategorizedWithLanguage.language!,
          keywords: categorized.keywords,
          topics: categorized.topics,
        }),
      )
    })

    test('with keywords', () => {
      const events = [categorized, recategorizedWithKeywords]

      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(
        new _.HasBeenCategorized({
          language: categorized.language,
          keywords: recategorizedWithKeywords.keywords!,
          topics: categorized.topics,
        }),
      )
    })

    test('with topics', () => {
      const events = [categorized, recategorizedWithTopics]

      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(
        new _.HasBeenCategorized({
          language: categorized.language,
          keywords: categorized.keywords,
          topics: recategorizedWithTopics.topics!,
        }),
      )
    })
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

    test.prop(
      [
        fc
          .tuple(command(), fc.languageCode())
          .filter(([command, language]) => !Equal.equals(command.language, language)),
      ],
      {
        examples: [[[{ language: 'en', keywords: [], topics: [], reviewRequestId }, 'de']]],
      },
    )('with a different language', ([command, language]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language, keywords: command.keywords, topics: command.topics }),
        command,
      )

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
              reviewRequestId: command.reviewRequestId,
              language: command.language,
            }),
          ),
        ),
      )
    })

    test.prop(
      [
        fc
          .tuple(command(), fc.array(fc.keywordId()))
          .filter(([command, keywords]) => !Equal.equals(Data.array(command.keywords), Data.array(keywords))),
      ],
      {
        examples: [
          [
            [
              { language: 'en', keywords: ['0002c27aea4747f32cb5'], topics: [], reviewRequestId },
              ['051301983f5df5f40ef4'],
            ],
          ],
        ],
      },
    )('with different keywords', ([command, keywords]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language: command.language, keywords, topics: command.topics }),
        command,
      )

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
              reviewRequestId: command.reviewRequestId,
              keywords: command.keywords,
            }),
          ),
        ),
      )
    })

    test.prop(
      [
        fc
          .tuple(command(), fc.array(fc.topicId()))
          .filter(([command, topics]) => !Equal.equals(Data.array(command.topics), Data.array(topics))),
      ],
      {
        examples: [[[{ language: 'en', keywords: [], topics: ['10001'], reviewRequestId }, ['10202']]]],
      },
    )('with different topics', ([command, topics]) => {
      const result = _.decide(
        new _.HasBeenCategorized({ language: command.language, keywords: command.keywords, topics }),
        command,
      )

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
              reviewRequestId: command.reviewRequestId,
              topics: command.topics,
            }),
          ),
        ),
      )
    })

    test.prop(
      [
        fc
          .tuple(command(), fc.languageCode(), fc.array(fc.keywordId()), fc.array(fc.topicId()))
          .filter(
            ([command, language, keywords, topics]) =>
              !Equal.equals(command.language, language) &&
              !Equal.equals(Data.array(command.keywords), Data.array(keywords)) &&
              !Equal.equals(Data.array(command.topics), Data.array(topics)),
          ),
      ],
      {
        examples: [
          [
            [
              { language: 'en', keywords: ['000093b5c386a313390a'], topics: ['10264'], reviewRequestId },
              'de',
              ['f61c4022cf9f517ca412'],
              ['13152'],
            ],
          ],
        ],
      },
    )('with all different', ([command, language, keywords, topics]) => {
      const result = _.decide(new _.HasBeenCategorized({ language, keywords, topics }), command)

      expect(result).toStrictEqual(
        Either.right(
          Option.some(
            new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
              reviewRequestId: command.reviewRequestId,
              language: command.language,
              keywords: command.keywords,
              topics: command.topics,
            }),
          ),
        ),
      )
    })
  })
})
