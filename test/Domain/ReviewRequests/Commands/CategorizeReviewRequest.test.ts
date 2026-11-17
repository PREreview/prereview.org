import { describe, expect, it, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Result, Equal, Option, Tuple } from 'effect'
import * as _ from '../../../../src/Domain/ReviewRequests/Commands/CategorizeReviewRequest.ts'
import * as ReviewRequests from '../../../../src/Domain/ReviewRequests/index.ts'
import { Uuid } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'

const reviewRequestId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const otherReviewRequestId = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')
const reviewRequestForAPreprintWasAccepted = new ReviewRequests.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  reviewRequestId,
})
const reviewRequestForAPreprintWasCategorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  topics: ['12520', '13393'],
  reviewRequestId,
})
const otherReviewRequestForAPreprintWasCategorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'pt',
  topics: ['14113'],
  reviewRequestId: otherReviewRequestId,
})

const command = (): fc.Arbitrary<_.Command> =>
  fc.record({
    language: fc.languageCode(),
    topics: fc.array(fc.topicId()),
    reviewRequestId: fc.uuid(),
  })

describe('foldState', () => {
  it.prop(
    'not yet categorized',
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

      expect(state).toStrictEqual(new _.NotCategorized())
    },
    {
      fastCheck: {
        examples: [
          [[[], reviewRequestId]], // no events
          [[[reviewRequestForAPreprintWasAccepted], reviewRequestId]], // with events
          [[[otherReviewRequestForAPreprintWasCategorized], reviewRequestId]], // for other review request
        ],
      },
    },
  )

  it.prop(
    'already categorized',
    [
      fc
        .reviewRequestForAPreprintWasCategorized()
        .map(event => Tuple.make(Array.make(event as ReviewRequests.ReviewRequestEvent), event.reviewRequestId, event)),
    ],
    ([[events, reviewRequestId, categorized]]) => {
      const state = _.foldState(events, reviewRequestId)

      expect(state).toStrictEqual(
        new _.HasBeenCategorized({
          language: categorized.language,
          topics: categorized.topics,
        }),
      )
    },
    {
      fastCheck: {
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
    },
  )

  describe('recategorized', () => {
    const categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
      language: 'es',
      topics: ['12520', '13393'],
      reviewRequestId,
    })
    const recategorizedWithLanguage = new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
      language: 'pt',
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
          topics: recategorizedWithTopics.topics!,
        }),
      )
    })
  })
})

describe('decide', () => {
  it.prop('has not been categorized', [command()], ([command]) => {
    const result = _.decide(new _.NotCategorized(), command)

    expect(result).toStrictEqual(
      Result.succeed(
        Option.some(
          new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
            language: command.language,
            topics: command.topics,
            reviewRequestId: command.reviewRequestId,
          }),
        ),
      ),
    )
  })

  describe('has already been categorized', () => {
    it.prop('with the details', [command()], ([command]) => {
      const result = _.decide(new _.HasBeenCategorized({ language: command.language, topics: command.topics }), command)

      expect(result).toStrictEqual(Result.succeed(Option.none()))
    })

    it.prop(
      'with a different language',
      [
        fc
          .tuple(command(), fc.languageCode())
          .filter(([command, language]) => !Equal.equals(command.language, language)),
      ],
      ([[command, language]]) => {
        const result = _.decide(new _.HasBeenCategorized({ language, topics: command.topics }), command)

        expect(result).toStrictEqual(
          Result.succeed(
            Option.some(
              new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
                reviewRequestId: command.reviewRequestId,
                language: command.language,
              }),
            ),
          ),
        )
      },
      {
        fastCheck: {
          examples: [[[{ language: 'en', topics: [], reviewRequestId }, 'de']]],
        },
      },
    )

    it.prop(
      'with different topics',
      [
        fc
          .tuple(command(), fc.array(fc.topicId()))
          .filter(([command, topics]) => !Equal.equals(command.topics, topics)),
      ],
      ([[command, topics]]) => {
        const result = _.decide(new _.HasBeenCategorized({ language: command.language, topics }), command)

        expect(result).toStrictEqual(
          Result.succeed(
            Option.some(
              new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
                reviewRequestId: command.reviewRequestId,
                topics: command.topics,
              }),
            ),
          ),
        )
      },
      {
        fastCheck: {
          examples: [[[{ language: 'en', topics: ['10001'], reviewRequestId }, ['10202']]]],
        },
      },
    )

    it.prop(
      'with all different',
      [
        fc
          .tuple(command(), fc.languageCode(), fc.array(fc.topicId()))
          .filter(
            ([command, language, topics]) =>
              !Equal.equals(command.language, language) && !Equal.equals(command.topics, topics),
          ),
      ],
      ([[command, language, topics]]) => {
        const result = _.decide(new _.HasBeenCategorized({ language, topics }), command)

        expect(result).toStrictEqual(
          Result.succeed(
            Option.some(
              new ReviewRequests.ReviewRequestForAPreprintWasRecategorized({
                reviewRequestId: command.reviewRequestId,
                language: command.language,
                topics: command.topics,
              }),
            ),
          ),
        )
      },
      {
        fastCheck: {
          examples: [[[{ language: 'en', topics: ['10264'], reviewRequestId }, 'de', ['13152']]]],
        },
      },
    )
  })
})
