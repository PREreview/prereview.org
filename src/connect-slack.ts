import type { FetchEnv } from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as R from 'fp-ts/Reader'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { type OAuthEnv, exchangeAuthorizationCode } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import jwtDecode from 'jwt-decode'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canConnectSlack } from './feature-flags'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { notFound, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { connectSlackMatch, myDetailsMatch } from './routes'
import { saveSlackUserId } from './slack-user-id'
import { NonEmptyStringC } from './string'
import { type GetUserEnv, type User, getUser, maybeGetUser } from './user'

export interface SlackOAuthEnv {
  slackOauth: OAuthEnv['oauth']
}

const authorizationRequestUrl = R.asks(({ slackOauth: { authorizeUrl, clientId, redirectUri } }: SlackOAuthEnv) => {
  return new URL(
    `?${new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri.href,
      scope: 'openid profile',
      team: 'T057XMB3EGH',
    }).toString()}`,
    authorizeUrl,
  )
})

export const connectSlack = pipe(
  RM.of({}),
  RM.apS('user', getUser),
  RM.apSW('authorizationRequestUrl', RM.rightReader(authorizationRequestUrl)),
  RM.bindW(
    'canConnectSlack',
    flow(
      fromReaderK(({ user }) => canConnectSlack(user)),
      RM.filterOrElse(
        canConnectSlack => canConnectSlack,
        () => 'not-found' as const,
      ),
    ),
  ),
  chainReaderKW(connectSlackPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          GetUserEnv & FathomEnv & OAuthEnv & PhaseEnv & PublicUrlEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with('not-found', () => notFound)
      .with('no-session', () => logInAndRedirect(connectSlackMatch.formatter, {}))
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const JwtD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => jwtDecode(s),
      () => D.error(s, 'JWT'),
    ),
  ),
)

const SlackD = D.struct({
  id_token: pipe(
    JwtD,
    D.compose(
      D.struct({
        'https://slack.com/user_id': NonEmptyStringC,
      }),
    ),
  ),
})

export const connectSlackCode = flow(
  (code: string) => RM.of({ code }),
  RM.apSW('user', getUser),
  RM.bindW(
    'slackUser',
    RM.fromReaderTaskEitherK(
      flow(
        get('code'),
        exchangeAuthorizationCode(SlackD),
        RTE.local((env: SlackOAuthEnv & FetchEnv) => ({ ...env, oauth: env.slackOauth })),
      ),
    ),
  ),
  RM.chainFirstReaderTaskEitherKW(({ user, slackUser }) =>
    saveSlackUserId(user.orcid, slackUser.id_token['https://slack.com/user_id']),
  ),
  RM.ichain(() => RM.redirect(format(myDetailsMatch.formatter, {}))),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
  RM.orElseW(() => showFailureMessage),
)

export const connectSlackError = (error: string) =>
  match(error)
    .with('access_denied', () => showAccessDeniedMessage)
    .otherwise(() => showFailureMessage)

const showAccessDeniedMessage = pipe(
  maybeGetUser,
  chainReaderKW(accessDeniedMessage),
  RM.ichainFirst(() => RM.status(Status.Forbidden)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareKW(sendHtml),
)

const showFailureMessage = pipe(
  maybeGetUser,
  chainReaderKW(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

function connectSlackPage({ user, authorizationRequestUrl }: { user: User; authorizationRequestUrl: URL }) {
  return page({
    title: plainText`My details`,
    content: html`
      <main id="main-content">
        <h1>Connect your Community Slack Account</h1>

        <p>You can connect your PREreview profile to your account on the PREreview Community Slack.</p>

        <h2>Before you start</h2>

        <p>
          You need to have an account on the PREreview Community Slack. If you don’t, fill out the
          <a href="https://bit.ly/PREreview-Slack">registration form</a> to create one.
        </p>

        <p>
          We’ll send you to Slack, where they will ask you to log in to the PREreview Community Slack and grant
          PREreview access to your account there. You may have already done these steps, and Slack will return you to
          PREreview.
        </p>

        <a href="${authorizationRequestUrl.href}" role="button" draggable="false">Start now</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function accessDeniedMessage(user?: User) {
  return page({
    title: plainText`Sorry, we can’t connect your account`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we can’t connect your account</h1>

        <p>You have denied PREreview access to your Community Slack account.</p>

        <p>Please try again.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function failureMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to connect your account right now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
