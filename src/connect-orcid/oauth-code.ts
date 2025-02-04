import { identity, pipe, String } from 'effect'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import type { Ord } from 'fp-ts/lib/Ord.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RS from 'fp-ts/lib/ReadonlySet.js'
import { MediaType, Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import type { Orcid } from 'orcid-id-ts'
import { maybeGetOrcidToken, saveOrcidToken } from '../orcid-token.js'
import { toUrl } from '../public-url.js'
import { FlashMessageResponse } from '../response.js'
import { connectOrcidMatch, myDetailsMatch } from '../routes.js'
import { NonEmptyStringC, ordNonEmptyString } from '../types/string.js'
import type { User } from '../user.js'
import { connectFailureMessage } from './failure-message.js'

export interface OrcidOAuthEnv {
  orcidOauth: {
    clientId: string
    clientSecret: string
    revokeUrl: URL
    tokenUrl: URL
  }
}

export const connectOrcidCode = ({ code, user }: { code: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('code', () => code),
    RTE.bindW('orcidUser', exchangeAuthorizationCode),
    RTE.bindW('oldOrcidToken', ({ user }) => maybeGetOrcidToken(user.orcid)),
    RTE.chainFirstW(({ user, orcidUser }) =>
      saveOrcidToken(user.orcid, {
        accessToken: orcidUser.access_token,
        scopes: orcidUser.scope,
      }),
    ),
    RTE.chainFirstW(({ oldOrcidToken }) =>
      oldOrcidToken ? revokeAccessToken(oldOrcidToken.accessToken) : RTE.of(undefined),
    ),
    RTE.matchW(
      () => connectFailureMessage,
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'orcid-connected' }),
    ),
  )

const exchangeAuthorizationCode = ({ code, user }: { code: string; user: User }) =>
  pipe(
    RTE.fromReader(toUrl(connectOrcidMatch.formatter, {})),
    RTE.chainW(redirectUri =>
      RTE.asks(({ orcidOauth: { clientId, clientSecret, tokenUrl } }: OrcidOAuthEnv) =>
        pipe(
          F.Request('POST')(tokenUrl),
          F.setBody(
            new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri.href,
              code,
            }).toString(),
            MediaType.applicationFormURLEncoded,
          ),
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(OrcidUserTokenD(user.orcid))),
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

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const SpaceSeparatedListD = <A>(decoder: D.Decoder<unknown, A>) =>
  pipe(NonEmptyStringC, D.map(String.split(' ')), D.compose(D.array(decoder)))

const ReadonlySetD = <A>(item: D.Decoder<unknown, A>, ordItem: Ord<A>) =>
  pipe(SpaceSeparatedListD(item), D.readonly, D.map(RS.fromReadonlyArray(ordItem)))

const OrcidUserTokenD = (orcid: Orcid) =>
  pipe(
    JsonD,
    D.compose(
      D.struct({
        access_token: NonEmptyStringC,
        orcid: D.literal(orcid),
        scope: ReadonlySetD(NonEmptyStringC, ordNonEmptyString),
      }),
    ),
  )
