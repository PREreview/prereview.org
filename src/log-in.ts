import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { Status, type StatusOpen } from 'hyper-ts'
import { exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { endSession as _endSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import { isOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { timeoutRequest } from './fetch'
import { html, plainText, sendHtml } from './html'
import { page } from './page'
import { ifHasSameOrigin, toUrl } from './public-url'
import { homeMatch } from './routes'
import { newSessionForUser } from './user'

export interface GetPseudonymEnv {
  getPseudonym: (user: OrcidUser) => TE.TaskEither<'unavailable', string>
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
)

export const logInAndRedirect = flow(
  fromReaderK(toUrl),
  RM.ichainW(flow(String, requestAuthorizationCode('/authenticate'))),
)

export const logOut = pipe(
  RM.redirect(format(homeMatch.formatter, {})),
  RM.ichainFirst(() => endSession),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
)

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

const OrcidUserD = D.struct({
  name: D.string,
  orcid: OrcidD,
})

type OrcidUser = D.TypeOf<typeof OrcidUserD>

const getPseudonym = (user: OrcidUser): RTE.ReaderTaskEither<GetPseudonymEnv, 'unavailable', string> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPseudonym }: GetPseudonymEnv) => getPseudonym(user)))

export const authenticate = flow(
  (code: string, state: string) => RM.of({ code, state }),
  RM.bind('referer', fromReaderK(flow(get('state'), getReferer))),
  RM.bindW(
    'user',
    RM.fromReaderTaskEitherK(
      flow(
        get('code'),
        exchangeAuthorizationCode(OrcidUserD),
        RTE.local(timeoutRequest(2000)),
        RTE.orElseFirstW(RTE.fromReaderIOK(() => L.warn('Unable to exchange authorization code'))),
      ),
    ),
  ),
  RM.bindW(
    'pseudonym',
    RM.fromReaderTaskEitherK(
      flow(get('user'), getPseudonym, RTE.orElseFirstW(RTE.fromReaderIOK(() => L.warn('Unable to get pseudonym')))),
    ),
  ),
  RM.ichainFirstW(flow(get('referer'), RM.redirect)),
  RM.ichainW(flow(({ user, pseudonym }) => ({ ...user, pseudonym }), newSessionForUser, storeSession)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
  RM.orElseW(() => showFailureMessage),
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
  RM.orElse(() => RM.right(undefined as void)),
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
