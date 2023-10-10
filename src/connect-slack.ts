import cookie from 'cookie'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { IO } from 'fp-ts/IO'
import * as J from 'fp-ts/Json'
import type * as O from 'fp-ts/Option'
import type { Ord } from 'fp-ts/Ord'
import * as R from 'fp-ts/Reader'
import * as RIO from 'fp-ts/ReaderIO'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as RS from 'fp-ts/ReadonlySet'
import { flow, identity, pipe } from 'fp-ts/function'
import { split } from 'fp-ts/string'
import { MediaType, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { canConnectSlack } from './feature-flags'
import { setFlashMessage } from './flash-message'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { notFound, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from './routes'
import { isSlackUser } from './slack-user'
import { saveSlackUserId } from './slack-user-id'
import { NonEmptyStringC, ordNonEmptyString } from './string'
import { type GetUserEnv, type User, getUser, maybeGetUser } from './user'

export interface SlackOAuthEnv {
  slackOauth: OAuthEnv['oauth']
}

export interface GenerateUuidEnv {
  generateUuid: IO<Uuid>
}

export interface SignValueEnv {
  signValue: (value: string) => string
}

export interface UnsignValueEnv {
  unsignValue: (value: string) => O.Option<string>
}

const generateUuid = pipe(
  RIO.ask<GenerateUuidEnv>(),
  RIO.chainIOK(({ generateUuid }) => generateUuid),
)

const signValue = (value: string) => R.asks(({ signValue }: SignValueEnv) => signValue(value))

const unsignValue = (value: string) => R.asks(({ unsignValue }: UnsignValueEnv) => unsignValue(value))

const authorizationRequestUrl = (state: string) =>
  R.asks(({ slackOauth: { authorizeUrl, clientId, redirectUri } }: SlackOAuthEnv) => {
    return new URL(
      `?${new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri.href,
        user_scope: 'users.profile:read,users.profile:write',
        state,
        team: 'T057XMB3EGH',
      }).toString()}`,
      authorizeUrl,
    )
  })

const exchangeAuthorizationCode = (code: string) =>
  pipe(
    RTE.asks(({ slackOauth: { clientId, clientSecret, redirectUri, tokenUrl } }: SlackOAuthEnv) =>
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
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(SlackUserTokenD)),
  )

export const connectSlack = pipe(
  RM.of({}),
  RM.apS('user', getUser),
  RM.bindW(
    'canConnectSlack',
    flow(
      RM.fromReaderK(({ user }) => canConnectSlack(user)),
      RM.filterOrElse(
        canConnectSlack => canConnectSlack,
        () => 'not-found' as const,
      ),
    ),
  ),
  RM.bindW(
    'isSlackUser',
    RM.fromReaderTaskEitherK(({ user }) => isSlackUser(user.orcid)),
  ),
  RM.ichainW(state =>
    match(state)
      .with(
        { isSlackUser: true },
        RM.fromMiddlewareK(() => seeOther(format(connectSlackStartMatch.formatter, {}))),
      )
      .with({ isSlackUser: false }, showConnectSlackPage)
      .exhaustive(),
  ),
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
      .with(P.union('unavailable', P.instanceOf(Error)), () => serviceUnavailable)
      .exhaustive(),
  ),
)

export const connectSlackStart = pipe(
  RM.of({}),
  RM.apS('user', getUser),
  RM.bindW(
    'canConnectSlack',
    flow(
      RM.fromReaderK(({ user }) => canConnectSlack(user)),
      RM.filterOrElse(
        canConnectSlack => canConnectSlack,
        () => 'not-found' as const,
      ),
    ),
  ),
  RM.apSW('state', RM.fromReaderIO(generateUuid)),
  RM.bindW(
    'signedState',
    RM.fromReaderK(({ state }) => signValue(state)),
  ),
  RM.bindW(
    'authorizationRequestUrl',
    RM.fromReaderK(({ state }) => authorizationRequestUrl(state)),
  ),
  RM.ichainFirst(() => RM.status(Status.SeeOther)),
  RM.ichainFirst(({ authorizationRequestUrl }) => RM.header('Location', authorizationRequestUrl.href)),
  RM.ichainFirst(({ signedState }) => RM.cookie('slack-state', signedState, { httpOnly: true })),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
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

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const CommaSeparatedListD = <A>(decoder: D.Decoder<unknown, A>) =>
  pipe(NonEmptyStringC, D.map(split(',')), D.compose(D.array(decoder)))

const ReadonlySetD = <A>(item: D.Decoder<unknown, A>, ordItem: Ord<A>) =>
  pipe(CommaSeparatedListD(item), D.readonly, D.map(RS.fromReadonlyArray(ordItem)))

const SlackUserTokenD = pipe(
  JsonD,
  D.compose(
    D.struct({
      authed_user: D.struct({
        id: NonEmptyStringC,
        access_token: NonEmptyStringC,
        token_type: D.literal('user'),
        scope: ReadonlySetD(NonEmptyStringC, ordNonEmptyString),
      }),
    }),
  ),
)

export const connectSlackCode = flow(
  (code: string, state: string) => RM.of({ code, state }),
  RM.apSW('user', getUser),
  RM.chainFirstW(({ state }) =>
    pipe(
      RM.decodeHeader('Cookie', D.string.decode),
      RM.mapLeft(() => 'no-cookie' as const),
      RM.chainOptionK(() => 'no-cookie' as const)(flow(cookie.parse, RR.lookup('slack-state'))),
      RM.chainReaderKW(unsignValue),
      RM.chainEitherK(E.fromOption(() => 'no-cookie' as const)),
      RM.filterOrElseW(
        expectedState => state === expectedState,
        () => 'invalid-state' as const,
      ),
    ),
  ),
  RM.bindW('slackUser', RM.fromReaderTaskEitherK(flow(get('code'), exchangeAuthorizationCode))),
  RM.chainFirstReaderTaskEitherKW(({ user, slackUser }) =>
    saveSlackUserId(user.orcid, {
      userId: slackUser.authed_user.id,
      accessToken: slackUser.authed_user.access_token,
      scopes: slackUser.authed_user.scope,
    }),
  ),
  RM.ichain(() => RM.redirect(format(myDetailsMatch.formatter, {}))),
  RM.ichainFirst(() => RM.clearCookie('slack-state', { httpOnly: true })),
  flow(
    RM.ichainMiddlewareKW(() => setFlashMessage('slack-connected')),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainFirst(() => RM.end()),
  ),
  RM.orElseW(() => showFailureMessage),
)

export const connectSlackError = (error: string) =>
  match(error)
    .with('access_denied', () => showAccessDeniedMessage)
    .otherwise(() => showFailureMessage)

const showConnectSlackPage = flow(
  RM.fromReaderK(connectSlackPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
)

const showAccessDeniedMessage = pipe(
  maybeGetUser,
  RM.chainReaderKW(accessDeniedMessage),
  RM.ichainFirst(() => RM.status(Status.Forbidden)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainFirst(() => RM.clearCookie('slack-state', { httpOnly: true })),
  RM.ichainMiddlewareKW(sendHtml),
)

const showFailureMessage = pipe(
  maybeGetUser,
  RM.chainReaderKW(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainFirst(() => RM.clearCookie('slack-state', { httpOnly: true })),
  RM.ichainMiddlewareK(sendHtml),
)

function connectSlackPage({ user }: { user: User }) {
  return page({
    title: plainText`Connect your Community Slack Account`,
    content: html`
      <main id="main-content">
        <h1>Connect your Community Slack Account</h1>

        <p>You can connect your PREreview profile to your account on the PREreview Community Slack.</p>

        <p>We’ll show your ORCID iD on your Slack profile.</p>

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

        <a href="${format(connectSlackStartMatch.formatter, {})}" role="button" draggable="false">Start now</a>
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
