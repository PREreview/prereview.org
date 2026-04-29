import { it } from '@effect/vitest'
import { Effect, Either, Equal } from 'effect'
import { describe, expect, vi } from 'vitest'
import * as Comments from '../../../src/Comments/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/CodeOfConductPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/WriteCommentFlow/Routes.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('CodeOfConductPage', () => {
  describe('when there is a user', () => {
    it.effect.prop(
      'when the comment is in progress',
      [
        fc.uuid(),
        fc
          .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteCommentCodeOfConduct.href({ commentId }),
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
        ),
    )

    it.effect.prop(
      'when the comment has been published',
      [
        fc.uuid(),
        fc
          .commentPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublished.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is being published',
      [
        fc.uuid(),
        fc
          .commentBeingPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublishing.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment hasn't been started",
      [fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()],
      ([commentId, comment, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is by a different author',
      [
        fc.uuid(),
        fc
          .tuple(fc.commentState(), fc.user())
          .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
        fc.supportedLocale(),
      ],
      ([commentId, [comment, user], locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment can't be loaded",
      [fc.uuid(), fc.user(), fc.supportedLocale()],
      ([commentId, user, locale]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductPage({ commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => new Queries.UnableToQuery({})),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })

  it.effect.prop("when there isn't a user", [fc.uuid(), fc.supportedLocale()], ([commentId, locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.CodeOfConductPage({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentCodeOfConduct.href({ commentId }),
      })
    }).pipe(Effect.provideService(Locale, locale), Effect.provideService(Comments.GetComment, shouldNotBeCalled)),
  )
})

describe('CodeOfConductSubmission', () => {
  describe('when there is a user', () => {
    describe('when the comment is in progress', () => {
      describe('when there is agreement', () => {
        it.effect.prop(
          'when the comment can be entered',
          [
            fc.uuid(),
            fc
              .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
            fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
          ],
          ([commentId, [comment, user], locale, nextCommand]) =>
            Effect.gen(function* () {
              const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)
              const getNextExpectedCommandForUserOnAComment = vi.fn<
                typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
              >(_ => Effect.succeed(Either.right(nextCommand)))

              const actual = yield* _.CodeOfConductSubmission({ body: { agree: 'yes' }, commentId }).pipe(
                Effect.provideService(Comments.HandleCommentCommand, handleCommentCommand),
                Effect.provideService(
                  Comments.GetNextExpectedCommandForUserOnAComment,
                  getNextExpectedCommandForUserOnAComment,
                ),
              )

              expect(actual).toStrictEqual({
                _tag: 'RedirectResponse',
                status: StatusCodes.SeeOther,
                location: RouteForCommand(nextCommand).href({ commentId }),
              })

              expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.AgreeToCodeOfConduct({ commentId }))
              expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(LoggedInUser, user),
            ),
        )

        it.effect.prop(
          "when the agreement can't be saved",
          [
            fc.uuid(),
            fc
              .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
              .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
            fc.supportedLocale(),
            fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
          ],
          ([commentId, [comment, user], locale, error]) =>
            Effect.gen(function* () {
              const actual = yield* _.CodeOfConductSubmission({ body: { agree: 'yes' }, commentId })

              expect(actual).toStrictEqual({
                _tag: 'PageResponse',
                status: StatusCodes.ServiceUnavailable,
                title: expect.anything(),
                main: expect.anything(),
                skipToLabel: 'main',
                js: [],
              })
            }).pipe(
              Effect.provideService(Locale, locale),
              Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
              Effect.provideService(Comments.HandleCommentCommand, () => error),
              Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
              Effect.provideService(LoggedInUser, user),
            ),
        )
      })

      it.effect.prop(
        "when there isn't agreement",
        [
          fc.uuid(),
          fc
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ agree: fc.string().filter(string => string !== 'yes') }, { requiredKeys: [] }),
            fc.anything().filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'agree'))),
          ),
        ],
        ([commentId, [comment, user], locale, body]) =>
          Effect.gen(function* () {
            const actual = yield* _.CodeOfConductSubmission({ body, commentId })

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              canonical: Routes.WriteCommentCodeOfConduct.href({ commentId }),
              status: StatusCodes.BadRequest,
              title: expect.anything(),
              nav: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'form',
              js: ['error-summary.js'],
            })
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
            Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
            Effect.provideService(LoggedInUser, user),
          ),
      )
    })

    it.effect.prop(
      'when the comment has been published',
      [
        fc.uuid(),
        fc
          .commentPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublished.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is being published',
      [
        fc.uuid(),
        fc
          .commentBeingPublished()
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.WriteCommentPublishing.href({ commentId }),
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment hasn't been started",
      [fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale(), fc.anything()],
      ([commentId, comment, user, locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'when the comment is by a different author',
      [
        fc.uuid(),
        fc
          .tuple(fc.commentState(), fc.user())
          .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
        fc.supportedLocale(),
        fc.anything(),
      ],
      ([commentId, [comment, user], locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "when the comment can't be loaded",
      [fc.uuid(), fc.user(), fc.supportedLocale(), fc.anything()],
      ([commentId, user, locale, body]) =>
        Effect.gen(function* () {
          const actual = yield* _.CodeOfConductSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => new Queries.UnableToQuery({})),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })

  it.effect.prop(
    "when there isn't a user",
    [fc.uuid(), fc.supportedLocale(), fc.anything()],
    ([commentId, locale, body]) =>
      Effect.gen(function* () {
        const actual = yield* _.CodeOfConductSubmission({ body, commentId })

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: Routes.WriteCommentCodeOfConduct.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, shouldNotBeCalled),
        Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
        Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      ),
  )
})
