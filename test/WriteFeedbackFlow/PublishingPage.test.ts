import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/PublishingPage/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('PublishingPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .commentBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is being published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteFeedbackPublishing.href({ feedbackId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: ['poll-redirect.js'],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteFeedbackPublished.href({ feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),

        Effect.provideService(Comments.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])("when the feedback publication hasn't been requested", (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

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
        Effect.provideService(Comments.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.PublishingPage({ feedbackId })

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
          Effect.provideService(Comments.GetFeedback, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.commentBeingPublished(), fc.user())
        .filter(([state, user]) => !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ feedbackId })

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
        Effect.provideService(Comments.GetFeedback, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.PublishingPage({ feedbackId })

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
          Effect.provideService(Comments.GetFeedback, () => Effect.fail(new Comments.UnableToQuery({}))),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (feedbackId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.PublishingPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteFeedbackPublishing.href({ feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetFeedback, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
