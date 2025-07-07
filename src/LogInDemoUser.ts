import { Effect } from 'effect'
import type { Locale } from './Context.js'
import * as FeatureFlags from './FeatureFlags.js'
import { HavingProblemsPage } from './HavingProblemsPage/index.js'
import { PageNotFound } from './PageNotFound/index.js'
import type * as Response from './response.js'

export const LogInDemoUser: Effect.Effect<Response.Response, never, Locale | FeatureFlags.FeatureFlags> = Effect.gen(
  function* () {
    yield* FeatureFlags.EnsureCanLogInAsDemoUser

    return yield* HavingProblemsPage
  },
).pipe(Effect.catchTag('CannotLogInAsDemoUser', () => PageNotFound))
