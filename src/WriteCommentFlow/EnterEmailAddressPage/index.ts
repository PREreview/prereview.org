import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'

export const EnterEmailAddressPage = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    return pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => pageNotFound),
      Match.tag('CommentInProgress', () => havingProblemsPage),
      Match.tag('CommentReadyForPublishing', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentCheck.href({ commentId }) }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) }),
      ),
      Match.tag('CommentPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )
