import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Record, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale, LoggedInUser } from '../../src/Context.js'
import { CanWriteFeedback } from '../../src/feature-flags.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Prereview from '../../src/Prereview.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/WriteFeedbackPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('WriteFeedbackPage', () => {
  describe('when there is a user', () => {
    describe('when the user can write feedback', () => {
      describe('when the data can be loaded', () => {
        test.prop([fc.integer(), fc.supportedLocale(), fc.user(), fc.prereview()])(
          "when they haven't started feedback",
          (id, locale, user, prereview) =>
            Effect.gen(function* () {
              const actual = yield* _.WriteFeedbackPage({ id })

              expect(actual).toStrictEqual({
                _tag: 'StreamlinePageResponse',
                canonical: Routes.WriteFeedback.href({ id: prereview.id }),
                status: StatusCodes.OK,
                title: expect.anything(),
                nav: expect.anything(),
                main: expect.anything(),
                skipToLabel: 'main',
                js: [],
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
                Effect.sync(Record.empty),
              ),
              Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
              Effect.provideService(CanWriteFeedback, () => true),
              Effect.provideService(LoggedInUser, user),
              Effect.provide(TestContext.TestContext),
              Effect.runPromise,
            ),
        )

        test.prop([
          fc.integer(),
          fc.supportedLocale(),
          fc.user(),
          fc.prereview(),
          fc.dictionary(
            fc.uuid(),
            fc.oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing(), fc.feedbackBeingPublished()),
            { minKeys: 1 },
          ),
        ])('when they have started feedback', (id, locale, user, prereview, feedback) =>
          Effect.gen(function* () {
            const actual = yield* _.WriteFeedbackPage({ id })

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SEE_OTHER,
              location: Routes.WriteFeedbackStartNow.href({ id: prereview.id }),
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, () =>
              Effect.succeed(feedback),
            ),
            Effect.provideService(Prereview.GetPrereview, () => Effect.succeed(prereview)),
            Effect.provideService(CanWriteFeedback, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )
      })

      test.prop([fc.integer(), fc.supportedLocale(), fc.user()])('when the PREreview was removed', (id, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.WriteFeedbackPage({ id })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewWasRemoved())),
          Effect.provideService(CanWriteFeedback, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )

      test.prop([fc.integer(), fc.supportedLocale(), fc.user()])("when the PREreview isn't found", (id, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.WriteFeedbackPage({ id })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsNotFound())),
          Effect.provideService(CanWriteFeedback, () => true),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )

      test.prop([fc.integer(), fc.supportedLocale(), fc.user()])(
        "when the PREreview can't be loaded",
        (id, locale, user) =>
          Effect.gen(function* () {
            const actual = yield* _.WriteFeedbackPage({ id })

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: StatusCodes.SERVICE_UNAVAILABLE,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'main',
              js: [],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
            Effect.provideService(Prereview.GetPrereview, () => Effect.fail(new Prereview.PrereviewIsUnavailable())),
            Effect.provideService(CanWriteFeedback, () => true),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
      )
    })

    test.prop([fc.integer(), fc.supportedLocale(), fc.user()])(
      'when the user cannot write feedback',
      (id, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.WriteFeedbackPage({ id })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
          Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
          Effect.provideService(CanWriteFeedback, () => false),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.integer(), fc.supportedLocale()])("when there isn't a user", (id, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.WriteFeedbackPage({ id })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview, shouldNotBeCalled),
      Effect.provideService(Prereview.GetPrereview, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
