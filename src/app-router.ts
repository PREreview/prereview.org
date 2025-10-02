import { Function, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import httpErrors from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import type * as L from 'logger-fp-ts'
import type { SupportedLocale } from './locales/index.ts'
import { authenticate, type GetPseudonymEnv, type IsUserBlockedEnv, type OrcidOAuthEnv } from './log-in/index.ts'
import type { TemplatePageEnv } from './page.ts'
import type { PublicUrlEnv } from './public-url.ts'
import { orcidCodeMatch } from './routes.ts'
import type { GetUserOnboardingEnv } from './user-onboarding.ts'
import type { User } from './user.ts'

export type RouterEnv = GetUserOnboardingEnv &
  IsUserBlockedEnv &
  GetPseudonymEnv & { locale: SupportedLocale; user?: User } & L.LoggerEnv &
  OrcidOAuthEnv &
  PublicUrlEnv &
  SessionEnv &
  TemplatePageEnv &
  FetchEnv

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      orcidCodeMatch.parser,
      P.map(({ code, state }) => authenticate(code, state)),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, Function.constant(new httpErrors.NotFound())), RM.fromMiddleware, RM.iflatten)
