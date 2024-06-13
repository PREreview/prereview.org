import cookie from 'cookie'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import type * as O from 'fp-ts/lib/Option.js'
import type { Ord } from 'fp-ts/lib/Ord.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import * as RS from 'fp-ts/lib/ReadonlySet.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import { split } from 'fp-ts/lib/string.js'
import { MediaType, type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { setFlashMessage } from '../flash-message.js'
import { type OrcidOAuthEnv, logInAndRedirect } from '../log-in/index.js'
import { seeOther, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import { type PublicUrlEnv, toUrl } from '../public-url.js'
import { handlePageResponse } from '../response.js'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../routes.js'
import { saveSlackUserId } from '../slack-user-id.js'
import { isSlackUser } from '../slack-user.js'
import { NonEmptyStringC, ordNonEmptyString } from '../types/string.js'
import { generateUuid } from '../types/uuid.js'
import { type GetUserEnv, type User, getUser, maybeGetUser } from '../user.js'
import { accessDeniedMessage } from './access-denied-message.js'
import { connectSlackPage } from './connect-slack-page.js'
import { failureMessage } from './failure-message.js'

export interface SlackOAuthEnv {
  slackOauth: Omit<OAuthEnv['oauth'], 'redirectUri'>
}

export interface SignValueEnv {
  signValue: (value: string) => string
}

export interface UnsignValueEnv {
  unsignValue: (value: string) => O.Option<string>
}

const signValue = (value: string) => R.asks(({ signValue }: SignValueEnv) => signValue(value))

const unsignValue = (value: string) => R.asks(({ unsignValue }: UnsignValueEnv) => unsignValue(value))

const authorizationRequestUrl = (state: string) =>
  pipe(
    toUrl(connectSlackMatch.formatter, {}),
    R.chainW(redirectUri =>
      R.asks(
        ({ slackOauth: { authorizeUrl, clientId } }: SlackOAuthEnv) =>
          new URL(
            `?${new URLSearchParams({
              client_id: clientId,
              response_type: 'code',
              redirect_uri: redirectUri.href,
              user_scope: 'users.profile:read,users.profile:write',
              state,
              team: 'T057XMB3EGH',
            }).toString()}`,
            authorizeUrl,
          ),
      ),
    ),
  )

const exchangeAuthorizationCode = (code: string) =>
  pipe(
    RTE.fromReader(toUrl(connectSlackMatch.formatter, {})),
    RTE.chainW(redirectUri =>
      RTE.asks(({ slackOauth: { clientId, clientSecret, tokenUrl } }: SlackOAuthEnv) =>
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
    RTE.chainTaskEitherKW(F.decode(SlackUserTokenD)),
  )

export const connectSlack = pipe(
  RM.of({}),
  RM.apS('user', getUser),
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
          GetUserEnv & OrcidOAuthEnv & PublicUrlEnv & TemplatePageEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with('no-session', () => logInAndRedirect(connectSlackMatch.formatter, {}))
      .with(P.union('unavailable', P.instanceOf(Error)), () => serviceUnavailable)
      .exhaustive(),
  ),
)

export const connectSlackStart = pipe(
  RM.of({}),
  RM.apS('user', getUser),
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
          GetUserEnv & OrcidOAuthEnv & PublicUrlEnv & TemplatePageEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
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
  ({ user }: { user: User }) => RM.of({ user }),
  RM.apS('response', RM.of(connectSlackPage)),
  RM.ichainW(handlePageResponse),
)

const showAccessDeniedMessage = pipe(
  RM.of({}),
  RM.apS('user', maybeGetUser),
  RM.apS('response', RM.of(accessDeniedMessage)),
  RM.ichainW(handlePageResponse),
)

const showFailureMessage = pipe(
  RM.of({}),
  RM.apS('user', maybeGetUser),
  RM.apS('response', RM.of(failureMessage)),
  RM.ichainW(handlePageResponse),
)
