import { Cookies, HttpServerResponse } from '@effect/platform'
import { Context, Duration, Effect, Function, flow, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { type OAuthEnv, exchangeAuthorizationCode } from 'hyper-ts-oauth'
import { storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { SessionStore } from '../Context.ts'
import { timeoutRequest } from '../fetch.ts'
import { setFlashMessage } from '../flash-message.ts'
import type { SupportedLocale } from '../locales/index.ts'
import { type PublicUrlEnv, ifHasSameOrigin, toUrl } from '../public-url.ts'
import { LogInResponse, handlePageResponse } from '../response.ts'
import * as Routes from '../routes.ts'
import { homeMatch, orcidCodeMatch } from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { NonEmptyString } from '../types/index.ts'
import { type OrcidId, isOrcidId } from '../types/OrcidId.ts'
import type { Pseudonym } from '../types/Pseudonym.ts'
import { SessionId, newSessionForUser } from '../user.ts'
import { accessDeniedMessage } from './access-denied-message.ts'
import { failureMessage } from './failure-message.ts'

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

export interface IsUserBlockedEnv {
  isUserBlocked: (user: OrcidId) => boolean
}

export const logIn = LogInResponse({ location: format(homeMatch.formatter, {}) })

export const LogOut = Effect.gen(function* () {
  const { cookie, store } = yield* SessionStore

  yield* pipe(
    Effect.serviceOptional(SessionId),
    Effect.andThen(sessionId => store.delete(sessionId)),
    Effect.ignore,
  )

  return yield* HttpServerResponse.redirect(format(Routes.homeMatch.formatter, {}), {
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

const getPseudonym = (user: OrcidUser): RTE.ReaderTaskEither<GetPseudonymEnv, 'unavailable', Pseudonym> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPseudonym }: GetPseudonymEnv) => getPseudonym(user)))

const isUserBlocked = (user: OrcidId): R.Reader<IsUserBlockedEnv, boolean> =>
  R.asks(({ isUserBlocked }) => isUserBlocked(user))

const filterBlockedUsers = <T extends OrcidUser>(user: T): RE.ReaderEither<IsUserBlockedEnv, T, T> =>
  pipe(
    isUserBlocked(user.orcid),
    R.map(isBlocked => (isBlocked ? E.left(user) : E.right(user))),
  )

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

export const authenticate = flow(
  (code: string, state: string) => RM.of({ code, state }),
  RM.bind(
    'referer',
    RM.fromReaderK(({ state }) => getReferer(state)),
  ),
  RM.bindW(
    'user',
    RM.fromReaderTaskEitherK(
      flow(
        ({ code }) => exchangeAuthorizationCode(OrcidUserC)(code),
        R.local(addRedirectUri<FetchEnv & OrcidOAuthEnv & PublicUrlEnv>()),
        RTE.local(timeoutRequest(2000)),
        RTE.orElseFirstW(RTE.fromReaderIOK(() => L.warn('Unable to exchange authorization code'))),
        RTE.chainFirstW(
          flow(
            RTE.fromReaderEitherK(filterBlockedUsers),
            RTE.orElseFirstW(RTE.fromReaderIOK(flow(OrcidUserC.encode, L.infoP('Blocked user from logging in')))),
            RTE.mapLeft(() => 'blocked' as const),
          ),
        ),
      ),
    ),
  ),
  RM.bindW(
    'pseudonym',
    RM.fromReaderTaskEitherK(
      flow(
        ({ user }) => getPseudonym(user),
        RTE.orElseFirstW(RTE.fromReaderIOK(() => L.warn('Unable to get pseudonym'))),
      ),
    ),
  ),
  flow(
    RM.ichainFirstW(({ referer }) => RM.redirect(referer)),
    RM.ichainFirstW(
      flow(
        ({ user, pseudonym }) => ({
          ...user,
          name: NonEmptyString.isNonEmptyString(user.name)
            ? user.name
            : NonEmptyString.NonEmptyString(`PREreviewer ${user.orcid}`),
          pseudonym,
        }),
        newSessionForUser,
        storeSession,
        orElseFirstW(RM.fromReaderIOK(error => L.errorP('Unable to store new session')({ error: error.message }))),
      ),
    ),
    RM.ichainW(({ referer }) =>
      referer === format(homeMatch.formatter, {}) ? RM.fromMiddleware(setFlashMessage('logged-in')) : RM.of(undefined),
    ),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainFirst(() => RM.end()),
  ),
  RM.orElseW(error =>
    match(error)
      .with('blocked', () =>
        pipe(
          RM.redirect(format(homeMatch.formatter, {})),
          RM.ichainW(() => RM.fromMiddleware(setFlashMessage('blocked'))),
          RM.ichain(() => RM.closeHeaders()),
          RM.ichain(() => RM.end()),
        ),
      )
      .otherwise(() =>
        pipe(
          RM.asks(({ locale }: { locale: SupportedLocale }) => locale),
          RM.ichainW(locale => handlePageResponse({ locale, response: failureMessage(locale) })),
        ),
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
      () => format(homeMatch.formatter, {}),
      referer => referer.href,
    ),
  )
}

function orElseFirstW<R2, E, I, O, M, B>(f: (e: E) => RM.ReaderMiddleware<R2, I, O, M, B>) {
  return <R1, A>(ma: RM.ReaderMiddleware<R1, I, O, E, A>): RM.ReaderMiddleware<R2 & R1, I, O, E | M, A> =>
    r =>
    c =>
      pipe(
        ma(r)(c),
        TE.orElseFirstW(e => f(e)(r)(c)),
      )
}
