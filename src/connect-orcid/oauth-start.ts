import { UrlParams } from '@effect/platform'
import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../locales/index.js'
import type { OrcidOAuthEnv } from '../log-in/index.js'
import { toUrl } from '../public-url.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { connectOrcidMatch } from '../routes.js'
import { OrcidLocale } from '../types/index.js'
import type { User } from '../user.js'

export const connectOrcidStart = ({ locale, user }: { locale: SupportedLocale; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromEither(E.fromNullable('no-session' as const)(user))),
    RTE.apSW('authorizationRequestUrl', RTE.fromReader(authorizationRequestUrl(locale))),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .exhaustive(),
      ({ authorizationRequestUrl }) => RedirectResponse({ location: authorizationRequestUrl }),
    ),
  )

const authorizationRequestUrl = (locale: SupportedLocale) =>
  pipe(
    toUrl(connectOrcidMatch.formatter, {}),
    R.chainW(redirectUri =>
      R.asks(({ orcidOauth: { authorizeUrl, clientId } }: OrcidOAuthEnv) => {
        return new URL(
          `?${UrlParams.toString(
            UrlParams.fromInput({
              client_id: clientId,
              lang: OrcidLocale.fromSupportedLocale(locale),
              response_type: 'code',
              redirect_uri: redirectUri.href,
              scope: '/activities/update /read-limited',
            }),
          )}`,
          authorizeUrl,
        )
      }),
    ),
  )
