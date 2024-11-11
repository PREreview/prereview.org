import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Equal, Option, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteFeedbackFlow/CompetingInterestsPage/index.js'
import * as DecideNextPage from '../../src/WriteFeedbackFlow/DecideNextPage.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('CompetingInterestsPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is in progress', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteCommentCompetingInterests.href({ commentId: feedbackId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['conditional-inputs.js'],
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
        .commentPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback has been published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublished.href({ commentId: feedbackId }),
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
        .commentBeingPublished()
        .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
      fc.supportedLocale(),
    ])('when the feedback is being published', (feedbackId, [feedback, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsPage({ feedbackId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(feedback)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the feedback hasn't been started",
      (feedbackId, feedback, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsPage({ feedbackId })

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
        const actual = yield* _.CompetingInterestsPage({ feedbackId })

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
          const actual = yield* _.CompetingInterestsPage({ feedbackId })

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
      const actual = yield* _.CompetingInterestsPage({ feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentCompetingInterests.href({ commentId: feedbackId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('CompetingInterestsSubmission', () => {
  describe('when there is a user', () => {
    describe('when the feedback is in progress', () => {
      describe('when the form is valid', () => {
        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ competingInterests: fc.constant('no'), competingInterestsDetails: fc.string() }),
            fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.nonEmptyString() }),
          ),
        ])('when the competing interests can be declared', (feedbackId, [feedback, user], locale, body) =>
          Effect.gen(function* () {
            const handleFeedbackCommand = jest.fn<typeof Comments.HandleFeedbackCommand.Service>(_ => Effect.void)

            const actual = yield* Effect.provideService(
              _.CompetingInterestsSubmission({ body, feedbackId }),
              Comments.HandleFeedbackCommand,
              handleFeedbackCommand,
            )

            expect(actual).toStrictEqual({
              _tag: 'RedirectResponse',
              status: StatusCodes.SEE_OTHER,
              location: DecideNextPage.NextPageAfterCommand({
                command: 'DeclareCompetingInterests',
                comment: feedback,
              }).href({
                commentId: feedbackId,
              }),
            })

            expect(handleFeedbackCommand).toHaveBeenCalledWith({
              feedbackId,
              command: new Comments.DeclareCompetingInterests({
                competingInterests:
                  body.competingInterests === 'yes' ? Option.some(body.competingInterestsDetails) : Option.none(),
              }),
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
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(feedback => fc.tuple(fc.constant(feedback), fc.user({ orcid: fc.constant(feedback.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ competingInterests: fc.constant('no'), competingInterestsDetails: fc.string() }),
            fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.nonEmptyString() }),
          ),
          fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
        ])("when the competing interests can't be declared", (feedbackId, [feedback, user], locale, body, error) =>
          Effect.gen(function* () {
            const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
            {
              competingInterests: fc.string().filter(competingInterests => !['no', 'yes'].includes(competingInterests)),
              competingInterestsDetails: fc.anything(),
            },
            { withDeletedKeys: true },
          ),
          fc.record(
            { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
            { withDeletedKeys: true },
          ),
          fc
            .anything()
            .filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'competingInterests'))),
        ),
      ])('when the form is invalid', (feedbackId, [feedback, user], locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteCommentCompetingInterests.href({ commentId: feedbackId }),
            status: StatusCodes.BAD_REQUEST,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js', 'error-summary.js'],
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
        const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
        const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
          const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
        const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
          const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

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
      const actual = yield* _.CompetingInterestsSubmission({ body, feedbackId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentCompetingInterests.href({ commentId: feedbackId }),
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
