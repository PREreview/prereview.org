import { Effect, Equal } from 'effect'
import * as Comments from '../../../Comments/index.ts'
import { Locale } from '../../../Context.ts'
import { HavingProblemsPage } from '../../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../../PageNotFound/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { PublishedPage as MakeResponse } from './PublishedPage.ts'

export const PublishedPage = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentPublished' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return MakeResponse({ doi: comment.doi, commentId, locale, prereviewId: comment.prereviewId })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    }),
  )
