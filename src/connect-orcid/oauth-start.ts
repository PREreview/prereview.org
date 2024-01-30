import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as R from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import type { OrcidOAuthEnv } from '../log-in'
import { toUrl } from '../public-url'
import { LogInResponse, RedirectResponse } from '../response'
import { connectOrcidMatch } from '../routes'
import type { User } from '../user'

export const connectOrcidStart = ({ user }: { user?: User }) =>
  pipe(
    RE.Do,
    RE.apS('user', RE.fromEither(E.fromNullable('no-session' as const)(user))),
    RE.apSW('authorizationRequestUrl', RE.fromReader(authorizationRequestUrl)),
    RE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .with(P.instanceOf(Error), () => havingProblemsPage)
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
