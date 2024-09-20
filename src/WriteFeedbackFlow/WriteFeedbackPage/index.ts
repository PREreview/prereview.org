import { Data, Effect } from 'effect'
import { LoggedInUser } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type * as Response from '../../response.js'

export const WriteFeedbackPage = (): Effect.Effect<Response.PageResponse> =>
  Effect.gen(function* () {
    yield* Effect.mapError(Effect.serviceOptional(LoggedInUser), () => new UserIsNotLoggedIn())

    return havingProblemsPage
  }).pipe(
    Effect.catchTags({
      UserIsNotLoggedIn: () => Effect.succeed(pageNotFound),
    }),
  )

class UserIsNotLoggedIn extends Data.TaggedError('UserIsNotLoggedIn') {}
