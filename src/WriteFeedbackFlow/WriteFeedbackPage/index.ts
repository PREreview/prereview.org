import { Effect, Record } from 'effect'
import { Locale } from '../../Context.js'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import * as Feedback from '../../Feedback/index.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { WriteFeedbackPage as MakeResponse } from './WriteFeedbackPage.js'

export const WriteFeedbackPage = ({
  id,
}: {
  id: number
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse,
  never,
  Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview | GetPrereview | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteFeedback

    const getPrereview = yield* GetPrereview
    const locale = yield* Locale

    const prereview = yield* getPrereview(id)

    const query = yield* Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview

    const unpublishedFeedback = yield* query({ authorId: user.orcid, prereviewId: prereview.id })

    if (!Record.isEmptyRecord(unpublishedFeedback)) {
      return Response.RedirectResponse({ location: Routes.WriteFeedbackStartNow.href({ id: prereview.id }) })
    }

    return MakeResponse({ prereview, locale, user })
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteFeedback: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
