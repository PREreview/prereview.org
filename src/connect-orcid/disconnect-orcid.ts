import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import { MediaType, Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.js'
import { type DeleteOrcidTokenEnv, type OrcidToken, deleteOrcidToken, maybeGetOrcidToken } from '../orcid-token.js'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { disconnectOrcidMatch, myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { disconnectOrcidPage } from './disconnect-orcid-page.js'
import { disconnectFailureMessage } from './failure-message.js'

export interface OrcidOAuthEnv {
  orcidOauth: {
    clientId: string
    clientSecret: string
    revokeUrl: URL
    tokenUrl: URL
  }
}

export const disconnectOrcid = ({ method, user }: { method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('orcidToken', ({ user }) => maybeGetOrcidToken(user.orcid)),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(disconnectOrcidMatch.formatter, {}) }))
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<
            RT.ReaderTask<
              DeleteOrcidTokenEnv & F.FetchEnv & OrcidOAuthEnv,
              FlashMessageResponse | RedirectResponse | PageResponse
            >
          >()
          .with({ orcidToken: undefined }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .with({ orcidToken: P.not(undefined), method: 'POST' }, handleForm)
          .with({ method: P.string }, () => RT.of(disconnectOrcidPage))
          .exhaustive(),
    ),
  )

const handleForm = ({ orcidToken, user }: { orcidToken: OrcidToken; user: User }) =>
  pipe(
    deleteOrcidToken(user.orcid),
    RTE.chainFirstW(() => revokeAccessToken(orcidToken.accessToken)),
    RTE.matchW(
      () => disconnectFailureMessage,
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'orcid-disconnected' }),
    ),
  )

const revokeAccessToken = (token: string) =>
  pipe(
    RTE.asks(({ orcidOauth: { clientId, clientSecret, revokeUrl } }: OrcidOAuthEnv) =>
      pipe(
        F.Request('POST')(revokeUrl),
        F.setBody(
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            token,
            token_type_hint: 'access_token',
          }).toString(),
          MediaType.applicationFormURLEncoded,
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  )
