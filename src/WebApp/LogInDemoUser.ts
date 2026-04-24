import { Effect, pipe } from 'effect'
import type { Locale } from '../Context.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { Prereviewers } from '../Prereviewers/index.ts'
import { OrcidId } from '../types/index.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageNotFound } from './PageNotFound/index.ts'
import * as Response from './Response/index.ts'

const demoUserOrcid = OrcidId.OrcidId('0000-0002-1825-0097')

export const LogInDemoUser: Effect.Effect<
  Response.Response | Response.ForceLogInResponse,
  never,
  Locale | FeatureFlags.FeatureFlags | Prereviewers
> = Effect.gen(function* () {
  yield* FeatureFlags.EnsureCanLogInAsDemoUser
  const prereviewers = yield* Prereviewers

  yield* Effect.if(prereviewers.isRegistered(demoUserOrcid), {
    onTrue: () => Effect.void,
    onFalse: () =>
      pipe(
        prereviewers.register(demoUserOrcid),
        Effect.tapError(error => Effect.logError('Unable to register demo user').pipe(Effect.annotateLogs({ error }))),
      ),
  })

  return Response.ForceLogInResponse({ user: { orcid: demoUserOrcid } })
}).pipe(
  Effect.catchTag('CannotLogInAsDemoUser', () => PageNotFound),
  Effect.catchTag('UnableToHandleCommand', 'UnableToQuery', () => HavingProblemsPage),
)
