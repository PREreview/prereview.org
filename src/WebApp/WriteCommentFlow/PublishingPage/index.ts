import { Effect, Equal } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { PublishingPage as MakeResponse } from './PublishingPage.ts'

export const PublishingPage = ({
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

    if (
      (comment._tag !== 'CommentBeingPublished' && comment._tag !== 'CommentPublished') ||
      !Equal.equals(user.orcid, comment.authorId)
    ) {
      return yield* PageNotFound
    }

    if (comment._tag === 'CommentPublished') {
      return Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })
    }

    const locale = yield* Locale

    return MakeResponse({ commentId, locale })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
    }),
  )
