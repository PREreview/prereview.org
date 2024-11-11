import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as DecideNextPage from '../DecideNextPage.js'
import * as CodeOfConductForm from './CodeOfConductForm.js'
import { CodeOfConductPage as MakeResponse } from './CodeOfConductPage.js'

export const CodeOfConductPage = ({
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

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => pageNotFound),
      Match.tag('CommentInProgress', comment =>
        MakeResponse({
          commentId,
          form: CodeOfConductForm.fromComment(comment),
          locale,
        }),
      ),
      Match.tag('CommentReadyForPublishing', comment =>
        MakeResponse({
          commentId,
          form: CodeOfConductForm.fromComment(comment),
          locale,
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
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCodeOfConduct.href({ commentId }) })),
    }),
  )

export const CodeOfConductSubmission = ({
  body,
  commentId,
}: {
  body: unknown
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

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', 'CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const form = yield* CodeOfConductForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedForm', () =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleCommentCommand

                yield* pipe(
                  handleCommand({
                    commentId,
                    command: new Comments.AgreeToCodeOfConduct(),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({
                  location: DecideNextPage.NextPageAfterCommand({ command: 'AgreeToCodeOfConduct', comment }).href({
                    commentId,
                  }),
                })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  commentId,
                  form,
                  locale,
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
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentCodeOfConduct.href({ commentId }) })),
    }),
  )
