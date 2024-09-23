import { Effect } from 'effect'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { GetPrereview } from '../../Prereview.js'
import type * as Response from '../../response.js'
import { EnsureUserIsLoggedIn } from '../../user.js'

export const StartNow = ({ id }: { id: number }): Effect.Effect<Response.PageResponse, never, GetPrereview> =>
  Effect.gen(function* () {
    yield* EnsureUserIsLoggedIn
    yield* EnsureCanWriteFeedback

    const getPrereview = yield* GetPrereview

    yield* getPrereview(id)

    return havingProblemsPage
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteFeedback: () => Effect.succeed(pageNotFound),
      PrereviewIsNotFound: () => Effect.succeed(pageNotFound),
      PrereviewIsUnavailable: () => Effect.succeed(havingProblemsPage),
      PrereviewWasRemoved: () => Effect.succeed(pageNotFound),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
