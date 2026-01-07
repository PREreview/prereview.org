import { Cookies, FetchHttpClient, HttpServerResponse } from '@effect/platform'
import { Boolean, Context, Duration, Effect, Function, Match, Redacted, Struct, flow, identity, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import { Locale, SessionStore } from '../../Context.ts'
import * as CookieSignature from '../../CookieSignature.ts'
import { timeoutRequest } from '../../fetch.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { OrcidOauth } from '../../OrcidOauth.ts'
import { PublicUrl, type PublicUrlEnv, ifHasSameOrigin, toUrl } from '../../public-url.ts'
import { FptsToEffect } from '../../RefactoringUtilities/index.ts'
import { FlashMessageResponse, LogInResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import { orcidCodeMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { NonEmptyString, Uuid } from '../../types/index.ts'
import { type OrcidId, isOrcidId } from '../../types/OrcidId.ts'
import type { Pseudonym } from '../../types/Pseudonym.ts'
import { SessionId, newSessionForUser } from '../../user.ts'
import { accessDeniedMessage } from './access-denied-message.ts'
import { failureMessage } from './failure-message.ts'

export interface OAuthEnv {
  readonly oauth: {
    readonly authorizeUrl: URL
    readonly clientId: string
    readonly clientSecret: string
    readonly redirectUri: URL
    readonly tokenUrl: URL
  }
}

export interface OrcidOAuthEnv {
  orcidOauth: Omit<OAuthEnv['oauth'], 'redirectUri'>
}

export class GetPseudonym extends Context.Tag('GetPseudonym')<
  GetPseudonym,
  (user: OrcidUser) => Effect.Effect<Pseudonym, 'unavailable'>
>() {}

export interface GetPseudonymEnv {
  getPseudonym: (user: OrcidUser) => TE.TaskEither<'unavailable', Pseudonym>
}

export class IsUserBlocked extends Context.Tag('IsUserBlocked')<IsUserBlocked, (user: OrcidId) => boolean>() {}

export const logIn = LogInResponse({ location: Routes.HomePage })

export const LogOut = Effect.gen(function* () {
  const { cookie, store } = yield* SessionStore

  yield* pipe(
    Effect.serviceOptional(SessionId),
    Effect.andThen(sessionId => store.delete(sessionId)),
    Effect.ignore,
  )

  return yield* HttpServerResponse.redirect(Routes.HomePage, {
    status: StatusCodes.SeeOther,
    cookies: Cookies.fromIterable([
      Cookies.unsafeMakeCookie('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
      Cookies.unsafeMakeCookie(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
    ]),
  })
})

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcidId, 'ORCID'))

const OrcidUserC = C.struct({
  name: C.string,
  orcid: OrcidC,
})

type OrcidUser = C.TypeOf<typeof OrcidUserC>

function addRedirectUri<R extends OrcidOAuthEnv & PublicUrlEnv>(): (env: R) => R & OAuthEnv {
  return env => ({
    ...env,
    oauth: {
      ...env.orcidOauth,
      redirectUri: pipe(toUrl(orcidCodeMatch.formatter, { code: 'code', state: 'state' })(env), url => {
        url.search = ''

        return url
      }),
    },
  })
}

export const authenticate = Effect.fn(
  function* (code: string, state: string) {
    const publicUrl = yield* PublicUrl
    const fetch = yield* FetchHttpClient.Fetch
    const orcidOauth = yield* OrcidOauth
    const { cookie, store } = yield* SessionStore
    const isUserBlocked = yield* IsUserBlocked
    const getPseudonym = yield* GetPseudonym

    const referer = yield* FptsToEffect.reader(getReferer(state), { publicUrl })

    const user = yield* pipe(
      FptsToEffect.readerTaskEither(
        pipe(
          exchangeAuthorizationCode(code),
          R.local(addRedirectUri<FetchEnv & OrcidOAuthEnv & PublicUrlEnv>()),
          RTE.local(timeoutRequest(2000)),
        ),
        {
          fetch,
          orcidOauth: {
            authorizeUrl: orcidOauth.authorizeUrl,
            clientId: orcidOauth.clientId,
            clientSecret: Redacted.value(orcidOauth.clientSecret),
            tokenUrl: orcidOauth.tokenUrl,
          },
          publicUrl,
        },
      ),
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logWarning('Unable to exchange authorization code'), { error }),
      ),
    )

    yield* Effect.if(isUserBlocked(user.orcid), {
      onFalse: () => Effect.void,
      onTrue: () =>
        pipe(
          Effect.fail('blocked' as const),
          Effect.tapError(() => Effect.logInfo('Blocked user from logging in')),
          Effect.annotateLogs('user', Struct.pick(user, 'name', 'orcid')),
        ),
    })

    const pseudonym = yield* Effect.tapError(getPseudonym(user), () => Effect.logWarning('Unable to get pseudonym'))

    const sessionId = yield* Uuid.generateUuid

    yield* pipe(
      {
        ...user,
        name: NonEmptyString.isNonEmptyString(user.name)
          ? user.name
          : NonEmptyString.NonEmptyString(`PREreviewer ${user.orcid}`),
        pseudonym,
      },
      newSessionForUser,
      session => Effect.tryPromise(() => store.set(sessionId, session)),
      Effect.tapError(error => Effect.logError('Unable to store new session').pipe(Effect.annotateLogs({ error }))),
    )

    return yield* pipe(
      HttpServerResponse.redirect(referer),
      HttpServerResponse.setCookie(cookie, yield* CookieSignature.sign(sessionId), {
        httpOnly: true,
        path: '/',
      }),
      Effect.andThen(
        Boolean.match(referer === Routes.HomePage, {
          onTrue: () => HttpServerResponse.setCookie('flash-message', 'logged-in', { httpOnly: true, path: '/' }),
          onFalse: () => identity<HttpServerResponse.HttpServerResponse>,
        }),
      ),
    )
  },
  Effect.catchAll(
    flow(
      Match.value,
      Match.when('blocked', () => Effect.fail(FlashMessageResponse({ location: Routes.HomePage, message: 'blocked' }))),
      Match.orElse(() => Effect.flip(Effect.andThen(Locale, failureMessage))),
    ),
  ),
)

export const authenticateError = ({ error, locale }: { error: string; locale: SupportedLocale }) =>
  match(error)
    .with('access_denied', () => accessDeniedMessage(locale))
    .otherwise(() => failureMessage(locale))

function getReferer(state: string) {
  return pipe(
    RE.fromEither(E.tryCatch(() => new URL(state), Function.constant('not-a-url'))),
    RE.chain(ifHasSameOrigin),
    RE.match(
      () => Routes.HomePage,
      referer => referer.href,
    ),
  )
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const AccessTokenD = pipe(
  D.struct({
    access_token: D.string,
    token_type: D.string,
  }),
  D.intersect(OrcidUserC),
)

const exchangeAuthorizationCode = (
  code: string,
): RTE.ReaderTaskEither<OAuthEnv & FetchEnv, unknown, D.TypeOf<typeof AccessTokenD>> =>
  pipe(
    RTE.asks(({ oauth: { clientId, clientSecret, redirectUri, tokenUrl } }: OAuthEnv) =>
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
          'application/x-www-form-urlencoded',
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(pipe(JsonD, D.compose(AccessTokenD)))),
  )
