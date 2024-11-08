import { Effect, Equal } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { PublishingPage as MakeResponse } from './PublishingPage.js'

export const PublishingPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Comments.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (
      (feedback._tag !== 'CommentBeingPublished' && feedback._tag !== 'CommentPublished') ||
      !Equal.equals(user.orcid, feedback.authorId)
    ) {
      return pageNotFound
    }

    if (feedback._tag === 'CommentPublished') {
      return Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId: feedbackId }) })
    }

    const locale = yield* Locale

    return MakeResponse({ feedbackId: feedbackId, locale })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }) }),
        ),
    }),
  )
