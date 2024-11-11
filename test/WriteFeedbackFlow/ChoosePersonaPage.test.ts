import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/ChoosePersonaPage/index.js'
import * as DecideNextPage from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('ChoosePersonaPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is in progress', (feedbackId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentPublished()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback has been published', (feedbackId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublished.href({ commentId: feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentBeingPublished()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is being published', (feedbackId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.ChoosePersonaPage({ feedbackId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.commentState(), fc.user())
        .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaPage({ feedbackId })

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
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.ChoosePersonaPage({ feedbackId })

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
          Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (feedbackId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.ChoosePersonaPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('ChoosePersonaSubmission', () => {
  describe('when there is a user', () => {
    describe('when the feedback is in progress', () => {
      describe('when there is feedback', () => {
        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.record({ persona: fc.constantFrom('public', 'pseudonym') }),
        ])('when the feedback can be entered', (feedbackId, [comment, user], locale, body) =>
          Effect.gen(function* () {
            const handleFeedbackCommand = jest.fn<typeof Comments.HandleFeedbackCommand.Service>(_ => Effect.void)

            const actual = yield* Effect.provideService(
              _.ChoosePersonaSubmission({ body, feedbackId }),
              Comments.HandleFeedbackCommand,
              handleFeedbackCommand,
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SEE_OTHER,
              location: DecideNextPage.NextPageAfterCommand({ command: 'ChoosePersona', comment }).href({
                commentId: feedbackId,
              }),
            })

            expect(handleFeedbackCommand).toHaveBeenCalledWith({
              feedbackId,
              command: new Comments.ChoosePersona({ persona: body.persona }),
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
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
          fc.record({ persona: fc.constantFrom('public', 'pseudonym') }),
          fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
        ])("when the persona can't be chosen", (feedbackId, [feedback, user], locale, body, error) =>
          Effect.gen(function* () {
            const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

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
            Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
            Effect.provideService(Comments.HandleFeedbackCommand, () => Effect.fail(error)),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )
      })

      test.prop([
        fc.uuid(),
        fc
          .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
          .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
        fc.supportedLocale(),
        fc.oneof(
          fc.record(
            { persona: fc.string().filter(persona => !['public', 'pseudonym'].includes(persona)) },
            { withDeletedKeys: true },
          ),
          fc.anything().filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'persona'))),
        ),
      ])("when there isn't a persona", (feedbackId, [feedback, user], locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }),
            status: StatusCodes.BAD_REQUEST,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['error-summary.js'],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
          Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc
        .commentPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublished.href({ commentId: feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback is being published', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
          Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.commentState(), fc.user())
        .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the feedback is by a different author', (feedbackId, [feedback, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

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
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the feedback can't be loaded",
      (feedbackId, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

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
          Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
          Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.anything()])("when there isn't a user", (feedbackId, locale, body) =>
    Effect.gen(function* () {
      const actual = yield* _.ChoosePersonaSubmission({ body, feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provideService(Comments.HandleFeedbackCommand, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})
