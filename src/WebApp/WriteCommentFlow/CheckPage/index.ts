import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import { HavingProblemsPage } from '../../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../../PageNotFound/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { CheckPage as MakeResponse } from './CheckPage.ts'

export const CheckPage = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', () => PageNotFound),
      Match.tag('CommentReadyForPublishing', comment =>
        Effect.succeed(
          MakeResponse({
            competingInterests: comment.competingInterests,
            comment: comment.comment,
            commentId,
            locale,
            persona: comment.persona,
            user,
          }),
        ),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
    }),
  )

export const CheckPageSubmission = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', () => PageNotFound),
      Match.tag('CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const handleCommand = yield* Comments.HandleCommentCommand

          yield* pipe(
            handleCommand(new Comments.PublishComment({ commentId })),
            Effect.catchIf(
              cause => cause._tag !== 'UnableToHandleCommand',
              cause => new Comments.UnableToHandleCommand({ cause }),
            ),
          )

          return Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
    }),
  )
