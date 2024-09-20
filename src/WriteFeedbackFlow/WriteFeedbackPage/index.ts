import { Effect } from 'effect'
import { EnsureCanWriteFeedback } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'

export const WriteFeedbackPage = (): Effect.Effect<Response.PageResponse> =>
  Effect.gen(function* () {
    yield* EnsureCanWriteFeedback

    return havingProblemsPage
  }).pipe(
    Effect.catchTags({
      NotAllowedToWriteFeedback: () => Effect.succeed(pageNotFound),
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
