import { Effect, Equal, Match, pipe } from 'effect'
import { Locale } from '../../Context.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { EnterFeedbackPage as MakeResponse } from './EnterFeedbackPage.js'

export const EnterFeedbackPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<Response.PageResponse | Response.StreamlinePageResponse, never, Feedback.GetFeedback | Locale> =>
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
      Match.tag('FeedbackInProgress', feedback =>
        MakeResponse({ feedbackId, locale, prereviewId: feedback.prereviewId }),
      ),
      Match.tag('FeedbackReadyForPublishing', feedback =>
        MakeResponse({ feedbackId, locale, prereviewId: feedback.prereviewId }),
      ),
      Match.tag('FeedbackPublished', () => havingProblemsPage),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
