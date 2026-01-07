import { Effect } from 'effect'
import type { Locale } from '../Context.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import * as Response from '../Response/index.ts'
import { NonEmptyString, OrcidId, Pseudonym } from '../types/index.ts'
import { PageNotFound } from './PageNotFound/index.ts'

export const LogInDemoUser: Effect.Effect<
  Response.Response | Response.ForceLogInResponse,
  never,
  Locale | FeatureFlags.FeatureFlags
> = Effect.gen(function* () {
  yield* FeatureFlags.EnsureCanLogInAsDemoUser

  return Response.ForceLogInResponse({
    user: {
      name: NonEmptyString.NonEmptyString('Josiah Carberry'),
      orcid: OrcidId.OrcidId('0000-0002-1825-0097'),
      pseudonym: Pseudonym.Pseudonym('Orange Panda'),
    },
  })
}).pipe(Effect.catchTag('CannotLogInAsDemoUser', () => PageNotFound))
