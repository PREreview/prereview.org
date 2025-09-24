import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.ts'
import { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../response.ts'
import * as Routes from '../../routes.ts'
import type { Uuid } from '../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../user.ts'
import { RouteForCommand } from '../Routes.ts'
import * as EnterCommentForm from './EnterCommentForm.ts'
import { EnterCommentPage as MakeResponse } from './EnterCommentPage.ts'

export const EnterCommentPage = ({
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

    return pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', comment =>
        MakeResponse({
          commentId,
          form: EnterCommentForm.fromComment(comment),
          locale,
          prereviewId: comment.prereviewId,
        }),
      ),
      Match.tag('CommentReadyForPublishing', comment =>
        MakeResponse({
          commentId,
          form: EnterCommentForm.fromComment(comment),
          locale,
          prereviewId: comment.prereviewId,
        }),
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
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterComment.href({ commentId }) })),
    }),
  )

export const EnterCommentSubmission = ({
  body,
  commentId,
}: {
  body: unknown
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Comments.GetNextExpectedCommandForUserOnAComment | Locale
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
      Match.tag('CommentInProgress', 'CommentReadyForPublishing', comment =>
        Effect.gen(function* () {
          const form = yield* EnterCommentForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedForm', form =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleCommentCommand

                yield* pipe(
                  handleCommand(new Comments.EnterComment({ commentId, comment: form.comment })),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
                const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

                return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  commentId,
                  form,
                  locale,
                  prereviewId: comment.prereviewId,
                }),
              ),
            ),
            Match.exhaustive,
          )
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
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterComment.href({ commentId }) })),
    }),
  )
