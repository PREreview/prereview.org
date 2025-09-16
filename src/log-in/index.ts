import { Function, Option, String, flow, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { type OAuthEnv, exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { endSession as _endSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { timeoutRequest } from '../fetch.js'
import { setFlashMessage } from '../flash-message.js'
import type { SupportedLocale } from '../locales/index.js'
import { type PublicUrlEnv, ifHasSameOrigin, toUrl } from '../public-url.js'
import { handlePageResponse } from '../response.js'
import { homeMatch, orcidCodeMatch } from '../routes.js'
import { NonEmptyString, OrcidLocale } from '../types/index.js'
import { type Orcid, isOrcid } from '../types/Orcid.js'
import type { Pseudonym } from '../types/Pseudonym.js'
import { newSessionForUser } from '../user.js'
import { accessDeniedMessage } from './access-denied-message.js'
import { failureMessage } from './failure-message.js'

export interface OrcidOAuthEnv {
  orcidOauth: Omit<OAuthEnv['oauth'], 'redirectUri'>
}

export interface GetPseudonymEnv {
  getPseudonym: (user: OrcidUser) => TE.TaskEither<'unavailable', Pseudonym>
}

export interface IsUserBlockedEnv {
  isUserBlocked: (user: Orcid) => boolean
}

export const logIn = pipe(
  RM.of({}),
  RM.apS(
    'state',
    RM.decodeHeader(
      'Referer',
      flow(Option.liftPredicate(String.isString), Option.match({ onNone: () => E.right(''), onSome: E.right })),
    ),
  ),
  RM.apS(
    'lang',
    RM.asks(({ locale }: { locale: SupportedLocale }) => OrcidLocale.fromSupportedLocale(locale)),
  ),
  RM.ichainW(({ state, lang }) => requestAuthorizationCode('/authenticate')(state, { lang })),
  R.local(addRedirectUri<OrcidOAuthEnv & PublicUrlEnv & { locale: SupportedLocale }>()),
)

export const logOut = pipe(
  RM.redirect(format(homeMatch.formatter, {})),
  RM.ichainFirst(() => endSession),
  RM.ichainW(() => RM.fromMiddleware(setFlashMessage('logged-out'))),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
)

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

const OrcidUserC = C.struct({
  name: C.string,
  orcid: OrcidC,
})

type OrcidUser = C.TypeOf<typeof OrcidUserC>

const getPseudonym = (user: OrcidUser): RTE.ReaderTaskEither<GetPseudonymEnv, 'unavailable', Pseudonym> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPseudonym }: GetPseudonymEnv) => getPseudonym(user)))

const isUserBlocked = (user: Orcid): R.Reader<IsUserBlockedEnv, boolean> =>
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

const endSession = pipe(
  _endSession(),
  RM.orElseW(() => RM.right(undefined)),
)

function orElseFirstW<R2, E, I, O, M, B>(f: (e: E) => RM.ReaderMiddleware<R2, I, O, M, B>) {
  return <R1, A>(ma: RM.ReaderMiddleware<R1, I, O, E, A>): RM.ReaderMiddleware<R2 & R1, I, O, E | M, A> =>
    r =>
    c =>
      pipe(
        ma(r)(c),
        TE.orElseFirstW(e => f(e)(r)(c)),
      )
}
