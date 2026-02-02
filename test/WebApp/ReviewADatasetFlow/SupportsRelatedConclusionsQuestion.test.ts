import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import { RouteForCommand } from '../../../src/WebApp/ReviewADatasetFlow/RouteForCommand.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/SupportsRelatedConclusionsQuestion/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('SupportsRelatedConclusionsQuestion', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([
      fc.uuid(),
      fc.supportedLocale(),
      fc.user(),
      fc.maybe(
        fc.record({
          answer: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
          detail: fc.maybe(fc.nonEmptyString()),
        }),
      ),
    ])('when the dataset review is in progress', (datasetReviewId, locale, user, answer) =>
      Effect.gen(function* () {
        const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['conditional-inputs.js'],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () => Effect.succeed(answer),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () =>
                new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () =>
                new DatasetReviews.DatasetReviewHasBeenPublished(),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    'when the dataset review is by a different user',
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () =>
              new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () =>
              new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.SupportsRelatedConclusionsQuestion({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: () => new Queries.UnableToQuery({}),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})

describe('SupportsRelatedConclusionsSubmission', () => {
  describe('when there is an answer', () => {
    describe('when the answer can be saved', () => {
      test.prop([
        fc.uuid(),
        fc.urlParams(
          fc.record(
            {
              supportsRelatedConclusions: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
              supportsRelatedConclusionsYesDetail: fc.string(),
              supportsRelatedConclusionsPartlyDetail: fc.string(),
              supportsRelatedConclusionsNoDetail: fc.string(),
            },
            { requiredKeys: ['supportsRelatedConclusions'] },
          ),
        ),
        fc.supportedLocale(),
        fc.user(),
        fc.datasetReviewNextExpectedCommand(),
      ])('the next expected command can be found', (datasetReviewId, body, locale, user, nextExpectedCommand) =>
        Effect.gen(function* () {
          const actual = yield* _.SupportsRelatedConclusionsSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              answerIfTheDatasetSupportsRelatedConclusions: () => Effect.void,
            }),
          ),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )

      test.prop([
        fc.uuid(),
        fc.urlParams(
          fc.record(
            {
              supportsRelatedConclusions: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
              supportsRelatedConclusionsYesDetail: fc.string(),
              supportsRelatedConclusionsPartlyDetail: fc.string(),
              supportsRelatedConclusionsNoDetail: fc.string(),
            },
            { requiredKeys: ['supportsRelatedConclusions'] },
          ),
        ),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
          fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
          fc.constant(Effect.succeedNone),
        ),
      ])("the next expected command can't be found", (datasetReviewId, body, locale, user, result) =>
        Effect.gen(function* () {
          const actual = yield* _.SupportsRelatedConclusionsSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              answerIfTheDatasetSupportsRelatedConclusions: () => Effect.void,
            }),
          ),
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getNextExpectedCommandForAUserOnADatasetReview: () => result,
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc.urlParams(
        fc.record(
          {
            supportsRelatedConclusions: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
            supportsRelatedConclusionsYesDetail: fc.string(),
            supportsRelatedConclusionsPartlyDetail: fc.string(),
            supportsRelatedConclusionsNoDetail: fc.string(),
          },
          { requiredKeys: ['supportsRelatedConclusions'] },
        ),
      ),
      fc.supportedLocale(),
      fc.user(),
      fc.constantFrom(
        new DatasetReviews.NotAuthorizedToRunCommand({}),
        new DatasetReviews.UnableToHandleCommand({}),
        new DatasetReviews.DatasetReviewHasNotBeenStarted(),
        new DatasetReviews.DatasetReviewIsBeingPublished(),
        new DatasetReviews.DatasetReviewHasBeenPublished(),
      ),
    ])("when the answer can't be saved", (datasetReviewId, body, locale, user, error) =>
      Effect.gen(function* () {
        const actual = yield* _.SupportsRelatedConclusionsSubmission({ body, datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewCommands, {
            answerIfTheDatasetSupportsRelatedConclusions: () => error,
          }),
        ),
        Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.oneof(
      fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'supportsRelatedConclusions'))),
      fc.urlParams(
        fc.record(
          {
            supportsRelatedConclusions: fc
              .string()
              .filter(string => !['yes', 'partly', 'no', 'unsure'].includes(string)),
            supportsRelatedConclusionsYesDetail: fc.string(),
            supportsRelatedConclusionsPartlyDetail: fc.string(),
            supportsRelatedConclusionsNoDetail: fc.string(),
          },
          { requiredKeys: ['supportsRelatedConclusions'] },
        ),
      ),
    ),
    fc.supportedLocale(),
    fc.user(),
  ])("when there isn't an answer", (datasetReviewId, body, locale, user) =>
    Effect.gen(function* () {
      const actual = yield* _.SupportsRelatedConclusionsSubmission({ body, datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: Routes.ReviewADatasetSupportsRelatedConclusions.href({ datasetReviewId }),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['conditional-inputs.js', 'error-summary.js'],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewCommands, {})),
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )
})
