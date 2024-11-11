import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { CheckPage as MakeResponse } from './CheckPage.js'

export const CheckPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(feedbackId)

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => pageNotFound),
      Match.tag('CommentInProgress', () => pageNotFound),
      Match.tag('CommentReadyForPublishing', comment =>
        MakeResponse({
          competingInterests: comment.competingInterests,
          feedback: comment.comment,
          feedbackId,
          locale,
          persona: comment.persona,
          user,
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }) }),
      ),
      Match.tag('CommentPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId: feedbackId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId: feedbackId }) })),
    }),
  )

export const CheckPageSubmission = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const feedback = yield* getComment(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    return yield* pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const handleCommand = yield* Comments.HandleCommentCommand

          yield* pipe(
            handleCommand({
              commentId: feedbackId,
              command: new Comments.PublishComment(),
            }),
            Effect.catchIf(
              cause => cause._tag !== 'UnableToHandleCommand',
              cause => new Comments.UnableToHandleCommand({ cause }),
            ),
          )

          return Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }) })
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId: feedbackId }) }),
        ),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId: feedbackId }) }),
        ),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCheck.href({ commentId: feedbackId }) })),
    }),
  )
