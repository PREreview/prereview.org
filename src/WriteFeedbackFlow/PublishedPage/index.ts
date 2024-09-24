import { Effect, Equal } from 'effect'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { PublishedPage as MakeResponse } from './PublishedPage.js'

export const PublishedPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<Response.PageResponse | Response.StreamlinePageResponse, never, Feedback.GetFeedback> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackPublished' || !Equal.equals(user.orcid, feedback.authorId)) {
      return pageNotFound
    }

    return MakeResponse({ doi: feedback.doi, feedbackId: feedbackId, prereviewId: feedback.prereviewId })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
