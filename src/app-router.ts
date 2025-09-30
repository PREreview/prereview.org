import { Function, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import httpErrors from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import type * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { withEnv } from './Fpts.ts'
import type * as Keyv from './keyv.ts'
import {
  createUserOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  type LegacyPrereviewApiEnv,
} from './legacy-prereview.ts'
import type { SupportedLocale } from './locales/index.ts'
import { authenticate, type IsUserBlockedEnv, type OrcidOAuthEnv } from './log-in/index.ts'
import type { TemplatePageEnv } from './page.ts'
import type { GetPreprintIdEnv } from './preprint.ts'
import type { PublicUrlEnv } from './public-url.ts'
import { orcidCodeMatch } from './routes.ts'
import type { ScietyListEnv } from './sciety-list/index.ts'
import type { OrcidId } from './types/OrcidId.ts'
import type { GetUserOnboardingEnv } from './user-onboarding.ts'
import type { User } from './user.ts'

export type RouterEnv = GetPreprintIdEnv &
  GetUserOnboardingEnv &
  Keyv.CareerStageStoreEnv &
  IsUserBlockedEnv &
  LegacyPrereviewApiEnv &
  Keyv.LocationStoreEnv & { locale: SupportedLocale; user?: User } & L.LoggerEnv &
  OrcidOAuthEnv &
  PublicUrlEnv &
  ScietyListEnv &
  SessionEnv &
  TemplatePageEnv &
  FetchEnv

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      orcidCodeMatch.parser,
      P.map(({ code, state }) => authenticate(code, state)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPseudonym: withEnv(
            (user: { orcid: OrcidId; name: string }) =>
              pipe(
                getPseudonymFromLegacyPrereview(user.orcid),
                RTE.orElse(error =>
                  match(error)
                    .with('not-found', () => createUserOnLegacyPrereview(user))
                    .with('unavailable', RTE.left)
                    .exhaustive(),
                ),
              ),
            env,
          ),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, Function.constant(new httpErrors.NotFound())), RM.fromMiddleware, RM.iflatten)
