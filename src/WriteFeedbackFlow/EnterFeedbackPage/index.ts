import { Effect, Match, pipe } from 'effect'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'

export const EnterFeedbackPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<Response.PageResponse | Response.StreamlinePageResponse, never, Feedback.GetFeedback> =>
  Effect.gen(function* () {
    yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    return pipe(
      Match.value(feedback),
      Match.tag('FeedbackNotStarted', () => pageNotFound),
      Match.tag('FeedbackInProgress', () => havingProblemsPage),
      Match.tag('FeedbackReadyForPublishing', () => havingProblemsPage),
      Match.tag('FeedbackPublished', () => havingProblemsPage),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
