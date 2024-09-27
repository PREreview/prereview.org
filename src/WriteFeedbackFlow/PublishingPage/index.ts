import { Effect, Equal } from 'effect'
import { Locale } from '../../Context.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { PublishingPage as MakeResponse } from './PublishingPage.js'

export const PublishingPage = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  Feedback.GetFeedback | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getFeedback = yield* Feedback.GetFeedback

    const feedback = yield* getFeedback(feedbackId)

    if (
      (feedback._tag !== 'FeedbackBeingPublished' && feedback._tag !== 'FeedbackPublished') ||
      !Equal.equals(user.orcid, feedback.authorId)
    ) {
      return pageNotFound
    }

    if (feedback._tag === 'FeedbackPublished') {
      return Response.RedirectResponse({ location: Routes.WriteFeedbackPublished.href({ feedbackId }) })
    }

    const locale = yield* Locale

    return MakeResponse({ feedbackId: feedbackId, locale })
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
