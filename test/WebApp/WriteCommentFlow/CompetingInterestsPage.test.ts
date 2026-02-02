import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect, Either, Equal, Option } from 'effect'
import * as Comments from '../../../src/Comments/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/CompetingInterestsPage/index.ts'
import { RouteForCommand } from '../../../src/WebApp/WriteCommentFlow/Routes.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('CompetingInterestsPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the comment is in progress', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteCommentCompetingInterests.href({ commentId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['conditional-inputs.js'],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
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
        const actual = yield* _.CompetingInterestsPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: Routes.WriteCommentPublished.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
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
        const actual = yield* _.CompetingInterestsPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: Routes.WriteCommentPublishing.href({ commentId }),
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the comment hasn't been started",
      (commentId, comment, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsPage({ commentId })

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
          EffectTest.run,
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
        const actual = yield* _.CompetingInterestsPage({ commentId })

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
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale()])(
      "when the comment can't be loaded",
      (commentId, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsPage({ commentId })

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
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale()])("when there isn't a user", (commentId, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.CompetingInterestsPage({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentCompetingInterests.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      EffectTest.run,
    ),
  )
})

describe('CompetingInterestsSubmission', () => {
  describe('when there is a user', () => {
    describe('when the comment is in progress', () => {
      describe('when the form is valid', () => {
        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ competingInterests: fc.constant('no'), competingInterestsDetails: fc.string() }),
            fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.nonEmptyString() }),
          ),
          fc.expectedCommandForUser().filter(nextCommand => nextCommand._tag !== 'ExpectedToStartAComment'),
        ])('when the competing interests can be declared', (commentId, [comment, user], locale, body, nextCommand) =>
          Effect.gen(function* () {
            const handleCommentCommand = jest.fn<typeof Comments.HandleCommentCommand.Service>(_ => Effect.void)
            const getNextExpectedCommandForUserOnAComment = jest.fn<
              typeof Comments.GetNextExpectedCommandForUserOnAComment.Service
            >(_ => Effect.succeed(Either.right(nextCommand)))

            const actual = yield* _.CompetingInterestsSubmission({ body, commentId }).pipe(
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

            expect(handleCommentCommand).toHaveBeenCalledWith(
              new Comments.DeclareCompetingInterests({
                commentId,
                competingInterests:
                  body.competingInterests === 'yes' ? Option.some(body.competingInterestsDetails) : Option.none(),
              }),
            )
            expect(getNextExpectedCommandForUserOnAComment).toHaveBeenCalledWith(commentId)
          }).pipe(
            Effect.provideService(Locale, locale),
            Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
            Effect.provideService(LoggedInUser, user),
            EffectTest.run,
          ),
        )

        test.prop([
          fc.uuid(),
          fc
            .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
            .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
          fc.supportedLocale(),
          fc.oneof(
            fc.record({ competingInterests: fc.constant('no'), competingInterestsDetails: fc.string() }),
            fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.nonEmptyString() }),
          ),
          fc.oneof(fc.constant(new Comments.UnableToHandleCommand({})), fc.commentError()),
        ])("when the competing interests can't be declared", (commentId, [comment, user], locale, body, error) =>
          Effect.gen(function* () {
            const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
            EffectTest.run,
          ),
        )
      })

      test.prop([
        fc.uuid(),
        fc
          .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
          .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
        fc.supportedLocale(),
        fc.oneof(
          fc.record(
            {
              competingInterests: fc.string().filter(competingInterests => !['no', 'yes'].includes(competingInterests)),
              competingInterestsDetails: fc.anything(),
            },
            { requiredKeys: [] },
          ),
          fc.record(
            { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
            { requiredKeys: [] },
          ),
          fc
            .anything()
            .filter(body => typeof body === 'object' && (body === null || !Object.hasOwn(body, 'competingInterests'))),
        ),
      ])('when the form is invalid', (commentId, [comment, user], locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.WriteCommentCompetingInterests.href({ commentId }),
            status: StatusCodes.BadRequest,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: ['conditional-inputs.js', 'error-summary.js'],
          })
        }).pipe(
          Effect.provideService(Locale, locale),
          Effect.provideService(Comments.GetComment, () => Effect.succeed(comment)),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
      )
    })

    test.prop([
      fc.uuid(),
      fc
        .commentPublished()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the comment has been published', (commentId, [comment, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
        EffectTest.run,
      ),
    )

    test.prop([
      fc.uuid(),
      fc
        .commentBeingPublished()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the comment is being published', (commentId, [comment, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the comment hasn't been started",
      (commentId, comment, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
          EffectTest.run,
        ),
    )

    test.prop([
      fc.uuid(),
      fc
        .tuple(fc.commentState(), fc.user())
        .filter(([state, user]) => state._tag !== 'CommentNotStarted' && !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
      fc.anything(),
    ])('when the comment is by a different author', (commentId, [comment, user], locale, body) =>
      Effect.gen(function* () {
        const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
        EffectTest.run,
      ),
    )

    test.prop([fc.uuid(), fc.user(), fc.supportedLocale(), fc.anything()])(
      "when the comment can't be loaded",
      (commentId, user, locale, body) =>
        Effect.gen(function* () {
          const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

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
          EffectTest.run,
        ),
    )
  })

  test.prop([fc.uuid(), fc.supportedLocale(), fc.anything()])("when there isn't a user", (commentId, locale, body) =>
    Effect.gen(function* () {
      const actual = yield* _.CompetingInterestsSubmission({ body, commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentCompetingInterests.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
      Effect.provideService(Comments.GetNextExpectedCommandForUserOnAComment, shouldNotBeCalled),
      EffectTest.run,
    ),
  )
})
