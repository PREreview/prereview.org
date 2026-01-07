import { UrlParams } from '@effect/platform'
import { HashSet, identity, pipe, String } from 'effect'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { SupportedLocale } from '../../locales/index.ts'
import { maybeGetOrcidToken, saveOrcidToken } from '../../orcid-token.ts'
import { toUrl } from '../../public-url.ts'
import { connectOrcidMatch, myDetailsMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { User } from '../../user.ts'
import { FlashMessageResponse } from '../Response/index.ts'
import { connectFailureMessage } from './failure-message.ts'

export interface OrcidOAuthEnv {
  orcidOauth: {
    clientId: string
    clientSecret: string
    revokeUrl: URL
    tokenUrl: URL
  }
}

export const connectOrcidCode = ({ code, locale, user }: { code: string; locale: SupportedLocale; user?: User }) =>
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
      () => connectFailureMessage(locale),
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
            pipe(
              UrlParams.fromInput({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri.href,
                code,
              }),
              UrlParams.toString,
            ),
            'application/x-www-form-urlencoded',
          ),
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(OrcidUserTokenD(user.orcid))),
  )

const revokeAccessToken = (token: string) =>
  pipe(
    RTE.asks(({ orcidOauth: { clientId, clientSecret, revokeUrl } }: OrcidOAuthEnv) =>
      pipe(
        F.Request('POST')(revokeUrl),
        F.setBody(
          pipe(
            UrlParams.fromInput({
              client_id: clientId,
              client_secret: clientSecret,
              token,
              token_type_hint: 'access_token',
            }),
            UrlParams.toString,
          ),
          'application/x-www-form-urlencoded',
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
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

const HashSetD = <A>(item: D.Decoder<unknown, A>) => pipe(SpaceSeparatedListD(item), D.map(HashSet.fromIterable))

const OrcidUserTokenD = (orcid: OrcidId) =>
  pipe(
    JsonD,
    D.compose(
      D.struct({
        access_token: NonEmptyStringC,
        orcid: D.literal(orcid),
        scope: HashSetD(NonEmptyStringC),
      }),
    ),
  )
