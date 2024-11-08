import { Effect, Equal, Match, pipe } from 'effect'
import { Locale } from '../../Context.js'
import * as Feedback from '../../Feedback/index.js'
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
  Feedback.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return pipe(
      Match.value(feedback),
      Match.tag('FeedbackNotStarted', () => pageNotFound),
      Match.tag('FeedbackInProgress', () => pageNotFound),
      Match.tag('FeedbackReadyForPublishing', feedback =>
        MakeResponse({
          competingInterests: feedback.competingInterests,
          feedback: feedback.feedback,
          feedbackId,
          locale,
          persona: feedback.persona,
          user,
        }),
      ),
      Match.tag('FeedbackBeingPublished', () =>
        Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) }),
      ),
      Match.tag('FeedbackPublished', () =>
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
  Feedback.GetFeedback | Feedback.HandleFeedbackCommand
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackNotStarted' && !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    return yield* pipe(
      Match.value(feedback),
      Match.tag('FeedbackNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('FeedbackInProgress', () => Effect.succeed(pageNotFound)),
      Match.tag('FeedbackReadyForPublishing', () =>
        Effect.gen(function* () {
          const handleCommand = yield* Feedback.HandleFeedbackCommand

          yield* pipe(
            handleCommand({
              feedbackId,
              command: new Feedback.PublishFeedback(),
            }),
            Effect.catchIf(
              cause => cause._tag !== 'UnableToHandleCommand',
              cause => new Feedback.UnableToHandleCommand({ cause }),
            ),
          )

          return Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })
        }),
      ),
      Match.tag('FeedbackBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteFeedbackPublishing.href({ feedbackId }) })),
      ),
      Match.tag('FeedbackPublished', () =>
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
