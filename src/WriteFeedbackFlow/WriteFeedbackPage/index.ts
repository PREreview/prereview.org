import { Effect } from 'effect'
import { Locale } from '../../Context.js'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import type * as Response from '../../response.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { WriteFeedbackPage as MakeResponse } from './WriteFeedbackPage.js'

export const WriteFeedbackPage = ({
  id,
}: {
  id: number
}): Effect.Effect<Response.PageResponse | Response.StreamlinePageResponse, never, GetPrereview | Locale> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteFeedback

    const getPrereview = yield* GetPrereview
    const locale = yield* Locale

    const prereview = yield* getPrereview(id)

    return MakeResponse({ prereview, locale, user })
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteFeedback: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
