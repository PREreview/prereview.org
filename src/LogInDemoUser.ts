import { Effect } from 'effect'
import type { Locale } from './Context.js'
import * as FeatureFlags from './FeatureFlags.js'
import { PageNotFound } from './PageNotFound/index.js'
import * as Response from './response.js'
import { Orcid, Pseudonym } from './types/index.js'

export const LogInDemoUser: Effect.Effect<
  Response.Response | Response.ForceLogInResponse,
  never,
  Locale | FeatureFlags.FeatureFlags
> = Effect.gen(function* () {
  yield* FeatureFlags.EnsureCanLogInAsDemoUser

  return Response.ForceLogInResponse({
    user: {
      name: 'Josiah Carberry',
      orcid: Orcid.Orcid('0000-0002-1825-0097'),
      pseudonym: Pseudonym.Pseudonym('Orange Panda'),
    },
  })
}).pipe(Effect.catchTag('CannotLogInAsDemoUser', () => PageNotFound))
