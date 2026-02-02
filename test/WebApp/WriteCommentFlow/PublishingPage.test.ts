import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal } from 'effect'
import * as Comments from '../../../src/Comments/index.ts'
import { Locale } from '../../../src/Context.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/PublishingPage/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('PublishingPage', () => {
  describe('when there is a user', () => {
    test.prop([
      fc.uuid(),
      fc
        .commentBeingPublished()
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])('when the comment is being published', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ commentId })

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: Routes.WriteCommentPublishing.href({ commentId }),
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: ['poll-redirect.js'],
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
    ])('when the comment is published', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ commentId })

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
        .oneof(fc.commentInProgress(), fc.commentReadyForPublishing())
        .chain(comment => fc.tuple(fc.constant(comment), fc.user({ orcid: fc.constant(comment.authorId) }))),
      fc.supportedLocale(),
    ])("when the comment publication hasn't been requested", (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ commentId })

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

    test.prop([fc.uuid(), fc.commentNotStarted(), fc.user(), fc.supportedLocale()])(
      "when the comment hasn't been started",
      (commentId, comment, user, locale) =>
        Effect.gen(function* () {
          const actual = yield* _.PublishingPage({ commentId })

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
        .tuple(fc.commentBeingPublished(), fc.user())
        .filter(([state, user]) => !Equal.equals(state.authorId, user.orcid)),
      fc.supportedLocale(),
    ])('when the comment is by a different author', (commentId, [comment, user], locale) =>
      Effect.gen(function* () {
        const actual = yield* _.PublishingPage({ commentId })

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
          const actual = yield* _.PublishingPage({ commentId })

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
      const actual = yield* _.PublishingPage({ commentId })

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: Routes.WriteCommentPublishing.href({ commentId }),
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(Comments.GetComment, shouldNotBeCalled),
      EffectTest.run,
    ),
  )
})
