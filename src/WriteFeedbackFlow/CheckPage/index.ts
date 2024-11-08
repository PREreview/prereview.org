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
  Comments.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Comments.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => pageNotFound),
      Match.tag('CommentInProgress', () => pageNotFound),
      Match.tag('CommentReadyForPublishing', feedback =>
        MakeResponse({
          competingInterests: feedback.competingInterests,
          feedback: feedback.comment,
          feedbackId,
          locale,
          persona: feedback.persona,
          user,
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) }),
      ),
      Match.tag('CommentPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) }),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteFeedbackCheck.href({ feedbackId }) })),
    }),
  )

export const CheckPageSubmission = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  Comments.GetFeedback | Comments.HandleFeedbackCommand
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Comments.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    return yield* pipe(
      Match.value(feedback),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentReadyForPublishing', () =>
        Effect.gen(function* () {
          const handleCommand = yield* Comments.HandleFeedbackCommand

          yield* pipe(
            handleCommand({
              feedbackId,
              command: new Comments.PublishComment(),
            }),
            Effect.catchIf(
              cause => cause._tag !== 'UnableToHandleCommand',
              cause => new Comments.UnableToHandleCommand({ cause }),
            ),
          )

          return Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })
        }),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteFeedbackCheck.href({ feedbackId }) })),
    }),
  )
