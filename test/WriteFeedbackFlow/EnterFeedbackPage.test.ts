import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Feedback from '../../src/Feedback/index.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/EnterFeedbackPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('EnterFeedbackPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is in progress', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
          status: StatusCodes.OK,
          title: expect.stringContaining('your feedback'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('your feedback'),
          skipToLabel: 'form',
          js: ['html-editor.js', 'editor-toolbar.js'],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.feedbackState(), fc.user())
        .filter(([state, user]) => state._tag !== 'FeedbackNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackPage({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.SERVICE_UNAVAILABLE,
            title: expect.stringContaining('problems'),
            main: expect.stringContaining('problems'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (feedbackId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.EnterFeedbackPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('EnterFeedbackSubmission', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.feedbackInProgress(), fc.feedbackReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
    ])('when the feedback is in progress', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .feedbackPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.feedbackNotStarted(), fc.user()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.stringContaining('not found'),
            main: expect.stringContaining('not found'),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.feedbackState(), fc.user())
        .filter(([state, user]) => state._tag !== 'FeedbackNotStarted' && !Equal.equals(state.authorId, user.orcid)),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user()])("when the feedback can't be loaded", (feedbackId, user) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Feedback.GetFeedback, () => Effect.fail(new Feedback.UnableToQuery({}))),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test.prop([fc.uuid()])("when there isn't a user", feedbackId =>
    Effect.gen(function* () {
      const actual = yield* _.EnterFeedbackSubmission({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Feedback.GetFeedback, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
