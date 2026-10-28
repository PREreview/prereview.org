import { UrlParams } from '@effect/platform'
import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import * as DatasetReviews from '../../../../src/DatasetReviews/index.ts'
import * as Queries from '../../../../src/Queries.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import { NonEmptyString } from '../../../../src/types/index.ts'
import * as _ from '../../../../src/WebApp/ReviewADatasetFlow/UseOfAiPage/index.ts'
import { RouteForCommand } from '../../../../src/WebApp/ReviewADatasetFlow/RouteForCommand.ts'
import * as fc from '../../../fc.ts'

describe('UseOfAiPage', () => {
  describe('when the dataset review is by the user', () => {
    it.effect.prop(
      'when the dataset review is in progress',
      [
        fc.uuid(),
        fc.supportedLocale(),
        fc.user(),
        fc.oneof(
          fc.record({ _tag: fc.constant('AiWasUsed'), generativeAiIdeasDetails: fc.maybe(fc.nonEmptyString()) }),
          fc.record({ _tag: fc.constant('AiWasNotUsed') }),
          fc.record({ _tag: fc.constant('NotAnswered') }),
        ),
        fc.boolean(),
      ],
      ([datasetReviewId, locale, user, useOfAi, multipleAuthors]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetUseOfAi.href({ datasetReviewId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js'],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () => Effect.succeed(useOfAi),
              areThereMultipleAuthorsOnAReview: () => Effect.succeed(multipleAuthors),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when the dataset review is being published',
      [fc.uuid(), fc.supportedLocale(), fc.user()],
      ([datasetReviewId, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
                new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ]),
        ),
    )

    it.effect.prop(
      'when the dataset review has been published',
      [fc.uuid(), fc.supportedLocale(), fc.user()],
      ([datasetReviewId, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
                new DatasetReviews.DatasetReviewHasBeenPublished(),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    'when the dataset review is by a different user',
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
              new DatasetReviews.DatasetReviewWasStartedByAnotherUser(),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the dataset review hasn't been started",
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () =>
              new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          }),
        ]),
      ),
  )

  it.effect.prop(
    "when the dataset review can't been queried",
    [fc.uuid(), fc.supportedLocale(), fc.user()],
    ([datasetReviewId, locale, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.UseOfAiPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: () => new Queries.UnableToQuery({}),
          }),
        ]),
      ),
  )
})

describe('UseOfAiSubmission', () => {
  describe('when there is an answer', () => {
    describe('when the answer can be saved', () => {
      it.effect.prop(
        'the next expected command can be found',
        [
          fc.uuid(),
          fc.constantFrom(
            [{ generativeAiIdeas: 'no' }, { answer: 'no' }],
            [{ generativeAiIdeas: 'no', generativeAiIdeasDetails: 'Some details' }, { answer: 'no' }],
            [{ generativeAiIdeas: 'yes' }, { answer: 'yes', detail: Option.none() }],
            [
              { generativeAiIdeas: 'yes', generativeAiIdeasDetails: ' ' },
              { answer: 'yes', detail: Option.none() },
            ],
            [
              { generativeAiIdeas: 'yes', generativeAiIdeasDetails: 'Some details' },
              { answer: 'yes', detail: Option.some(NonEmptyString.NonEmptyString('Some details')) },
            ],
          ),
          fc.supportedLocale(),
          fc.user(),
          fc.datasetReviewNextExpectedCommand(),
        ],
        ([datasetReviewId, [body, answer], locale, user, nextExpectedCommand]) =>
          Effect.gen(function* () {
            const declareIfAiWasUsedToGenerateNewIdeas = vi.fn<
              typeof DatasetReviews.DatasetReviewCommands.Service.declareIfAiWasUsedToGenerateNewIdeas
            >(_ => Effect.void)

            const actual = yield* _.UseOfAiSubmission({ body: UrlParams.fromInput(body), datasetReviewId }).pipe(
              Effect.provide(
                Layer.mock(DatasetReviews.DatasetReviewCommands, { declareIfAiWasUsedToGenerateNewIdeas }),
              ),
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SeeOther,
              location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId }),
            })
            expect(declareIfAiWasUsedToGenerateNewIdeas).toHaveBeenCalledWith({
              ...answer,
              datasetReviewId,
              userId: user.orcid,
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(DatasetReviews.DatasetReviewQueries, {
                getNextExpectedCommandForAUserOnADatasetReview: () => Effect.succeedSome(nextExpectedCommand),
              }),
            ]),
          ),
      )

      it.effect.prop(
        "the next expected command can't be found",
        [
          fc.uuid(),
          fc.urlParams(fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') })),
          fc.supportedLocale(),
          fc.user(),
          fc.oneof(
            fc.anything().map(cause => new Queries.UnableToQuery({ cause })),
            fc.anything().map(cause => new DatasetReviews.UnknownDatasetReview({ cause })),
            fc.constant(Effect.succeedNone),
          ),
        ],
        ([datasetReviewId, body, locale, user, result]) =>
          Effect.gen(function* () {
            const actual = yield* _.UseOfAiSubmission({ body, datasetReviewId })

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.ServiceUnavailable,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provide([
              Layer.succeed(Locale, locale),
              Layer.succeed(LoggedInUser, user),
              Layer.mock(DatasetReviews.DatasetReviewCommands, {
                declareIfAiWasUsedToGenerateNewIdeas: () => Effect.void,
              }),
              Layer.mock(DatasetReviews.DatasetReviewQueries, {
                getNextExpectedCommandForAUserOnADatasetReview: () => result,
              }),
            ]),
          ),
      )
    })

    it.effect.prop(
      "when the answer can't be saved",
      [
        fc.uuid(),
        fc.urlParams(fc.record({ generativeAiIdeas: fc.constantFrom('yes', 'no') })),
        fc.supportedLocale(),
        fc.user(),
        fc.constantFrom(
          new DatasetReviews.UnableToHandleCommand({}),
          new DatasetReviews.DatasetReviewHasNotBeenStarted(),
          new DatasetReviews.DatasetReviewIsBeingPublished(),
          new DatasetReviews.DatasetReviewHasBeenPublished(),
        ),
      ],
      ([datasetReviewId, body, locale, user, error]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewCommands, {
              declareIfAiWasUsedToGenerateNewIdeas: () => error,
            }),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {}),
          ]),
        ),
    )
  })

  describe("when there isn't an answer", () => {
    it.effect.prop(
      'shows an error',
      [
        fc.uuid(),
        fc.oneof(
          fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'generativeAiIdeas'))),
          fc.urlParams(fc.record({ generativeAiIdeas: fc.string().filter(string => !['yes', 'no'].includes(string)) })),
        ),
        fc.supportedLocale(),
        fc.user(),
        fc.boolean(),
      ],
      ([datasetReviewId, body, locale, user, multipleAuthors]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetUseOfAi.href({ datasetReviewId }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js', 'error-summary.js'],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              areThereMultipleAuthorsOnAReview: () => Effect.succeed(multipleAuthors),
            }),
          ]),
        ),
    )

    it.effect.prop(
      "when the authors can't be checked",
      [
        fc.uuid(),
        fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'generativeAiIdeas'))),
        fc.supportedLocale(),
        fc.user(),
      ],
      ([datasetReviewId, body, locale, user]) =>
        Effect.gen(function* () {
          const actual = yield* _.UseOfAiSubmission({ body, datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide([
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
            Layer.mock(DatasetReviews.DatasetReviewCommands, {}),
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              areThereMultipleAuthorsOnAReview: () => new Queries.UnableToQuery({}),
            }),
          ]),
        ),
    )
  })
})
