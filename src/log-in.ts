import type { FetchEnv } from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { Status } from 'hyper-ts'
import { type OAuthEnv as _OAuthEnv, exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { endSession as _endSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import { type Orcid, isOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { timeoutRequest } from './fetch'
import { setFlashMessage } from './flash-message'
import { html, plainText, sendHtml } from './html'
import { page } from './page'
import { type PublicUrlEnv, ifHasSameOrigin, toUrl } from './public-url'
import { homeMatch, orcidCodeMatch } from './routes'
import type { Pseudonym } from './types/pseudonym'
import { newSessionForUser } from './user'

export interface OAuthEnv {
  oauth: Omit<_OAuthEnv['oauth'], 'redirectUri'>
}

export interface GetPseudonymEnv {
  getPseudonym: (user: OrcidUser) => TE.TaskEither<'unavailable', Pseudonym>
}

export interface IsUserBlockedEnv {
  isUserBlocked: (user: Orcid) => boolean
}

export const logIn = pipe(
  RM.decodeHeader(
    'Referer',
    flow(
      O.fromPredicate(isString),
      O.match(() => E.right(''), E.right),
    ),
  ),
  RM.ichainW(requestAuthorizationCode('/authenticate')),
  R.local(addRedirectUri()),
)

export const logInAndRedirect = flow(
  RM.fromReaderK(toUrl),
  RM.ichainW(flow(String, requestAuthorizationCode('/authenticate'))),
  R.local(addRedirectUri()),
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

function addRedirectUri<R extends OAuthEnv & PublicUrlEnv>(): (env: R) => R & _OAuthEnv {
  return env => ({
    ...env,
    oauth: {
      ...env.oauth,
      redirectUri: pipe(toUrl(orcidCodeMatch.formatter, { code: 'code', state: 'state' })(env), url => {
        url.search = ''

        return url
      }),
    },
  })
}

export const authenticate = flow(
  (code: string, state: string) => RM.of({ code, state }),
  RM.bind('referer', RM.fromReaderK(flow(get('state'), getReferer))),
  RM.bindW(
    'user',
    RM.fromReaderTaskEitherK(
      flow(
        get('code'),
        exchangeAuthorizationCode(OrcidUserC),
        R.local(addRedirectUri<FetchEnv & OAuthEnv & PublicUrlEnv>()),
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
      flow(get('user'), getPseudonym, RTE.orElseFirstW(RTE.fromReaderIOK(() => L.warn('Unable to get pseudonym')))),
    ),
  ),
  flow(
    RM.ichainFirstW(flow(get('referer'), RM.redirect)),
    RM.ichainFirstW(flow(({ user, pseudonym }) => ({ ...user, pseudonym }), newSessionForUser, storeSession)),
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
      .otherwise(() => showFailureMessage),
  ),
)

export const authenticateError = (error: string) =>
  match(error)
    .with('access_denied', () => showAccessDeniedMessage)
    .otherwise(() => showFailureMessage)

function getReferer(state: string) {
  return pipe(
    RE.fromEither(E.tryCatch(() => new URL(state), constant('not-a-url'))),
    RE.chain(ifHasSameOrigin),
    RE.match(
      () => format(homeMatch.formatter, {}),
      referer => referer.href,
    ),
  )
}

const showAccessDeniedMessage = pipe(
  RM.rightReader(accessDeniedMessage()),
  RM.ichainFirst(() => RM.status(Status.Forbidden)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const showFailureMessage = pipe(
  RM.rightReader(failureMessage()),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

const endSession = pipe(
  _endSession(),
  RM.orElseW(() => RM.right(undefined)),
)

function accessDeniedMessage() {
  return page({
    title: plainText`Sorry, we can’t log you in`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we can’t log you in</h1>

        <p>You have denied PREreview access to your ORCID&nbsp;iD.</p>

        <p>Please try again.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function failureMessage() {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to log you in right now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}
