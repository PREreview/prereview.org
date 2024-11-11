import { Effect, Equal } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { PublishedPage as MakeResponse } from './PublishedPage.js'

export const PublishedPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(feedbackId)

    if (comment._tag !== 'CommentPublished' || !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return MakeResponse({ doi: comment.doi, feedbackId, locale, prereviewId: comment.prereviewId })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteCommentPublished.href({ commentId: feedbackId }) }),
        ),
    }),
  )
