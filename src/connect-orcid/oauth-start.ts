import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { canConnectOrcidProfile } from '../feature-flags.js'
import { pageNotFound } from '../http-error.js'
import type { OrcidOAuthEnv } from '../log-in/index.js'
import { toUrl } from '../public-url.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { connectOrcidMatch } from '../routes.js'
import type { User } from '../user.js'

export const connectOrcidStart = ({ user }: { user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromEither(E.fromNullable('no-session' as const)(user))),
    RTE.bindW(
      'canConnectOrcidProfile',
      flow(
        RTE.fromReaderK(({ user }) => canConnectOrcidProfile(user)),
        RTE.filterOrElse(
          canConnectOrcidProfile => canConnectOrcidProfile,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.apSW('authorizationRequestUrl', RTE.fromReader(authorizationRequestUrl)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      ({ authorizationRequestUrl }) => RedirectResponse({ location: authorizationRequestUrl }),
    ),
  )

const authorizationRequestUrl = pipe(
  toUrl(connectOrcidMatch.formatter, {}),
  R.chainW(redirectUri =>
    R.asks(({ orcidOauth: { authorizeUrl, clientId } }: OrcidOAuthEnv) => {
      return new URL(
        `?${new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri.href,
          scope: '/activities/update /read-limited',
        }).toString()}`,
        authorizeUrl,
      )
    }),
  ),
)
