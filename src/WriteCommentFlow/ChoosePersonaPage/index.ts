import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import * as DecideNextPage from '../DecideNextPage.js'
import * as ChoosePersonaForm from './ChoosePersonaForm.js'
import { ChoosePersonaPage as MakeResponse } from './ChoosePersonaPage.js'

export const ChoosePersonaPage = ({
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
      Match.tag('CommentInProgress', comment =>
        MakeResponse({
          feedbackId,
          form: ChoosePersonaForm.fromFeedback(comment),
          locale,
          user,
        }),
      ),
      Match.tag('CommentReadyForPublishing', comment =>
        MakeResponse({
          feedbackId,
          form: ChoosePersonaForm.fromFeedback(comment),
          locale,
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
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }) }),
        ),
    }),
  )

export const ChoosePersonaSubmission = ({
  body,
  feedbackId,
}: {
  body: unknown
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetComment | Comments.HandleCommentCommand | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const feedback = yield* getComment(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', 'CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const form = yield* ChoosePersonaForm.fromBody(body)

          return yield* pipe(
            Match.value(form),
            Match.tag('CompletedForm', form =>
              Effect.gen(function* () {
                const handleCommand = yield* Comments.HandleCommentCommand

                yield* pipe(
                  handleCommand({
                    commentId: feedbackId,
                    command: new Comments.ChoosePersona({ persona: form.persona }),
                  }),
                  Effect.catchIf(
                    cause => cause._tag !== 'UnableToHandleCommand',
                    cause => new Comments.UnableToHandleCommand({ cause }),
                  ),
                )

                return Response.RedirectResponse({
                  location: DecideNextPage.NextPageAfterCommand({ command: 'ChoosePersona', comment: feedback }).href({
                    commentId: feedbackId,
                  }),
                })
              }),
            ),
            Match.tag('InvalidForm', form =>
              Effect.succeed(
                MakeResponse({
                  feedbackId,
                  form,
                  locale,
                  user,
                }),
              ),
            ),
            Match.exhaustive,
          )
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
        Effect.succeed(
          Response.LogInResponse({ location: Routes.WriteCommentChoosePersona.href({ commentId: feedbackId }) }),
        ),
    }),
  )
