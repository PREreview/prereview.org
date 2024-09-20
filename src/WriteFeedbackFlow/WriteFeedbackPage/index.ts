import { Effect } from 'effect'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'
import { EnsureUserIsLoggedIn } from '../../user.js'

export const WriteFeedbackPage = (): Effect.Effect<Response.PageResponse> =>
  Effect.gen(function* () {
    yield* EnsureUserIsLoggedIn

    return havingProblemsPage
  }).pipe(
    Effect.catchTags({
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )
