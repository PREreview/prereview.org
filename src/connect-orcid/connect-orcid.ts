import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.ts'
import type { SupportedLocale } from '../locales/index.ts'
import { maybeGetOrcidToken } from '../orcid-token.ts'
import { LogInResponse, RedirectResponse } from '../response.ts'
import { connectOrcidMatch, connectOrcidStartMatch } from '../routes.ts'
import type { User } from '../user.ts'
import { connectOrcidPage } from './connect-orcid-page.ts'

export const connectOrcid = ({ locale, user }: { locale: SupportedLocale; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('orcidToken', ({ user }) => maybeGetOrcidToken(user.orcid)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      ({ orcidToken }) =>
        match(orcidToken)
          .with(P.not(undefined), () => RedirectResponse({ location: format(connectOrcidStartMatch.formatter, {}) }))
          .with(undefined, () => connectOrcidPage(locale))
          .exhaustive(),
    ),
  )
