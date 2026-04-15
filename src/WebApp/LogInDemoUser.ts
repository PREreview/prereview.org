import { Effect } from 'effect'
import type { Locale } from '../Context.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { OrcidId } from '../types/index.ts'
import { PageNotFound } from './PageNotFound/index.ts'
import * as Response from './Response/index.ts'

export const LogInDemoUser: Effect.Effect<
  Response.Response | Response.ForceLogInResponse,
  never,
  Locale | FeatureFlags.FeatureFlags
> = Effect.gen(function* () {
  yield* FeatureFlags.EnsureCanLogInAsDemoUser

  return Response.ForceLogInResponse({ user: { orcid: OrcidId.OrcidId('0000-0002-1825-0097') } })
}).pipe(Effect.catchTag('CannotLogInAsDemoUser', () => PageNotFound))
