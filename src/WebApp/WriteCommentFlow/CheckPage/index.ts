import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../../Domain/Comments/index.ts'
import { Locale } from '../../../Context.ts'
import * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { CheckPage as MakeResponse } from './CheckPage.ts'

export const CheckPage: (input: {
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Prereviewers.Prereviewers | Locale
> = Effect.fn('WriteCommentFlow.CheckPage')(
  function* ({ commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* Match.valueTags(comment, {
      CommentInProgress: () => PageNotFound,
      CommentReadyForPublishing: comment =>
        Effect.map(Prereviewers.getPersona({ orcidId: user.orcid, persona: comment.persona }), persona =>
          MakeResponse({
            competingInterests: comment.competingInterests,
            comment: comment.comment,
            commentId,
            locale,
            persona,
          }),
        ),
      CommentBeingPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      CommentPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
    }),
)

export const CheckPageSubmission: (input: {
  commentId: Uuid.Uuid
}) => Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Locale
> = Effect.fn('WriteCommentFlow.CheckPageSubmission')(
  function* ({ commentId }) {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    return yield* Match.valueTags(comment, {
      CommentInProgress: () => PageNotFound,
      CommentReadyForPublishing: Effect.fnUntraced(function* () {
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
      CommentBeingPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      CommentPublished: () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
    })
  },
  (effect, { commentId }) =>
    Effect.catchTags(effect, {
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
    }),
)
