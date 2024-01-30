import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import type { Ord } from 'fp-ts/Ord'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RS from 'fp-ts/ReadonlySet'
import { identity, pipe } from 'fp-ts/function'
import { split } from 'fp-ts/string'
import { MediaType, Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { saveOrcidToken } from '../orcid-token'
import { toUrl } from '../public-url'
import { RedirectResponse } from '../response'
import { connectOrcidMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC, ordNonEmptyString } from '../types/string'
import type { User } from '../user'
import { failureMessage } from './failure-message'

export interface OrcidOAuthEnv {
  orcidOauth: {
    clientId: string
    clientSecret: string
    tokenUrl: URL
  }
}

export const connectOrcidCode = ({ code, user }: { code: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('code', () => code),
    RTE.bindW('orcidUser', exchangeAuthorizationCode),
    RTE.chainFirstW(({ user, orcidUser }) =>
      saveOrcidToken(user.orcid, {
        accessToken: orcidUser.access_token,
        scopes: orcidUser.scope,
      }),
    ),
    RTE.matchW(
      () => failureMessage,
      () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
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

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const SpaceSeparatedListD = <A>(decoder: D.Decoder<unknown, A>) =>
  pipe(NonEmptyStringC, D.map(split(' ')), D.compose(D.array(decoder)))

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
