import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, Equal, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as Comments from '../../src/Comments/index.js'
import * as ContactEmailAddress from '../../src/contact-email-address.js'
import { Locale, LoggedInUser } from '../../src/Context.js'
import * as Routes from '../../src/routes.js'
import * as _ from '../../src/WriteCommentFlow/EnterEmailAddressPage/index.js'
import { RouteForCommand } from '../../src/WriteCommentFlow/Routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('EnterEmailAddressPage', () => {
  describe('when there is a user', () => {
    describe('when the comment is in progress', () => {
      describe("when there isn't a confirmed verified email address", () => {
        test.prop([
          fc.uuid(),
          fc
            .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.verifiedContactEmailAddress(),
        ])('when there is a verified email address', (commentId, [comment, user], locale, contactEmailAddress) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterEmailAddressPage({ commentId })

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
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.succeed(contactEmailAddress),
            ),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )

        test.prop([
          fc.uuid(),
          fc
            .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.unverifiedContactEmailAddress(),
        ])('when there is an unverified email address', (commentId, [comment, user], locale, contactEmailAddress) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterEmailAddressPage({ commentId })

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
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
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.succeed(contactEmailAddress),
            ),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )

        test.prop([
          fc.uuid(),
          fc
            .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
        ])("when there isn't an email address", (commentId, [comment, user], locale) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterEmailAddressPage({ commentId })

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
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
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.fail(new ContactEmailAddress.ContactEmailAddressIsNotFound()),
            ),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )

        test.prop([
          fc.uuid(),
          fc
            .commentInProgress({ verifiedEmailAddressExists: fc.constant(undefined) })
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
        ])("when there the email address can't be checked", (commentId, [comment, user], locale) =>
          Effect.gen(function* () {
            const actual = yield* _.EnterEmailAddressPage({ commentId })

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
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(ContactEmailAddress.GetContactEmailAddress, () =>
              Effect.fail(new ContactEmailAddress.ContactEmailAddressIsUnavailable()),
            ),
            Effect.provideService(LoggedInUser, user),
            Effect.provide(TestContext.TestContext),
            Effect.runPromise,
          ),
        )
      })

      test.prop([
        fc.uuid(),
        fc
          .commentInProgress({ verifiedEmailAddressExists: fc.constant(true) })
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
      ])('when there is a confirmed verified email address', (commentId, [comment, user], locale, nextCommand) =>
        Effect.gen(function* () {
          const getNextExpectedCommandForUserOnAComment = jest.fn<
            typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
          >(_ => Effect.succeed(Either.right(nextCommand)))

          const actual = yield* Effect.provideService(
            _.EnterEmailAddressPage({ commentId }),
            Comments.GetNextExpectedCommandForUserOnAComment,
            getNextExpectedCommandForUserOnAComment,
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SEE_OTHER,
            location: RouteForCommand(nextCommand).href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc
        .commentReadyForPublishing()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the comment is ready for publishing', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentCheck.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
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
    ])('when the comment has been published', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublished.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
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
    ])('when the comment is being published', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublishing.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the comment hasn't been started",
      (commentId, comment, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

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
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
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
    ])('when the comment is by a different author', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressPage({ commentId })

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
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
        Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the comment can't be loaded",
      (commentId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressPage({ commentId })

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
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          Effect.provide(TestContext.TestContext),
          Effect.runPromise,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (commentId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.EnterEmailAddressPage({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      Effect.provideService(ContactEmailAddress.GetContactEmailAddress, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

describe('EnterEmailAddressSubmission', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .commentInProgress()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
    ])('when the comment is in progress', (commentId, [comment, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({
          commentId,
        })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentReadyForPublishing()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
    ])('when the comment is ready for publishing', (commentId, [comment, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentCheck.href({ commentId }),
        })
      }).pipe(
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
    ])('when the comment has been published', (commentId, [comment, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublished.href({ commentId }),
        })
      }).pipe(
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
    ])('when the comment is being published', (commentId, [comment, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SEE_OTHER,
          location: Routes.WriteCommentPublishing.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user()])(
      "when the comment hasn't been started",
      (commentId, comment, user) =>
        Effect.gen(function* () {
          const actual = yield* _.EnterEmailAddressSubmission({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NOT_FOUND,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
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
    ])('when the comment is by a different author', (commentId, [comment, user]) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.uuid(), fc.user()])("when the comment can't be loaded", (commentId, user) =>
      Effect.gen(function* () {
        const actual = yield* _.EnterEmailAddressSubmission({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Comments.GetComment, () => Effect.fail(new Comments.UnableToQuery({}))),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test.prop([fc.uuid()])("when there isn't a user", commentId =>
    Effect.gen(function* () {
      const actual = yield* _.EnterEmailAddressSubmission({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentEnterEmailAddress.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})