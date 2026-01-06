import { UrlParams } from '@effect/platform'
import { HashSet, String, Struct, flow, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { Slack } from '../../ExternalApis/index.ts'
import { havingProblemsPage } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type PublicUrlEnv, toUrl } from '../../public-url.ts'
import { FlashMessageResponse, LogInResponse, RedirectResponse, type Response } from '../../Response/index.ts'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../../routes.ts'
import { type AddToSessionEnv, type PopFromSessionEnv, addToSession, popFromSession } from '../../session.ts'
import { type EditSlackUserIdEnv, saveSlackUserId } from '../../slack-user-id.ts'
import { type IsSlackUserEnv, isSlackUser } from '../../slack-user.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import { type GenerateUuidEnv, generateUuidIO } from '../../types/uuid.ts'
import type { User } from '../../user.ts'
import { accessDeniedMessage } from './access-denied-message.ts'
import { connectSlackPage } from './connect-slack-page.ts'
import { failureMessage } from './failure-message.ts'

export interface SlackOAuthEnv {
  slackOauth: {
    readonly authorizeUrl: URL
    readonly clientId: string
    readonly clientSecret: string
    readonly tokenUrl: URL
  }
}

const authorizationRequestUrl = (state: string) =>
  pipe(
    toUrl(connectSlackMatch.formatter, {}),
    R.chainW(redirectUri =>
      R.asks(({ slackOauth: { authorizeUrl, clientId } }: SlackOAuthEnv) =>
        pipe(
          UrlParams.fromInput({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri.href,
            user_scope: 'users.profile:read,users.profile:write',
            state,
            team: 'T057XMB3EGH',
          }),
          params => new URL(`?${UrlParams.toString(params)}`, authorizeUrl),
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
    RTE.chainTaskEitherKW(F.decode(SlackUserTokenD)),
  )

export const connectSlack = ({
  locale,
  user,
}: {
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<IsSlackUserEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
    RTE.bindW('isSlackUser', ({ user }) => isSlackUser(user.orcid)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectSlackMatch.formatter, {}) }))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      state =>
        match(state)
          .with({ isSlackUser: true }, () =>
            RedirectResponse({ location: format(connectSlackStartMatch.formatter, {}) }),
          )
          .with({ locale: P.select(), isSlackUser: false }, connectSlackPage)
          .exhaustive(),
    ),
  )

export const connectSlackStart = ({
  locale,
  user,
}: {
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<GenerateUuidEnv & PublicUrlEnv & SlackOAuthEnv & AddToSessionEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bind('state', () => RTE.rightReaderIO(generateUuidIO)),
    RTE.bindW(
      'authorizationRequestUrl',
      RTE.fromReaderK(({ state }) => authorizationRequestUrl(state)),
    ),
    RTE.chainFirstW(({ state }) => addToSession('slack-state', state)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectSlackMatch.formatter, {}) }))
          .with('unavailable', P.instanceOf(Error), () => havingProblemsPage(locale))
          .exhaustive(),
      ({ authorizationRequestUrl }) => RedirectResponse({ location: authorizationRequestUrl }),
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
  pipe(NonEmptyStringC, D.map(String.split(',')), D.compose(D.array(decoder)))

const HashSetD = <A>(item: D.Decoder<unknown, A>) => pipe(CommaSeparatedListD(item), D.map(HashSet.fromIterable))

const SlackIdD = pipe(
  NonEmptyStringC,
  D.map(string => Slack.UserId.make(string)),
)

const SlackUserTokenD = pipe(
  JsonD,
  D.compose(
    D.struct({
      authed_user: D.struct({
        id: SlackIdD,
        access_token: NonEmptyStringC,
        token_type: D.literal('user'),
        scope: HashSetD(NonEmptyStringC),
      }),
    }),
  ),
)

export const connectSlackCode = ({
  code,
  locale,
  state,
  user,
}: {
  code: string
  locale: SupportedLocale
  state: string
  user?: User
}): RT.ReaderTask<F.FetchEnv & PopFromSessionEnv & PublicUrlEnv & SlackOAuthEnv & EditSlackUserIdEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.let('code', () => code),
    RTE.let('locale', () => locale),
    RTE.let('state', () => state),
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.chainFirstW(({ state }) =>
      pipe(
        popFromSession('slack-state'),
        RTE.filterOrElseW(
          expectedState => state === expectedState,
          () => 'invalid-state' as const,
        ),
      ),
    ),
    RTE.bindW('slackUser', flow(Struct.get('code'), exchangeAuthorizationCode)),
    RTE.chainFirstW(({ user, slackUser }) =>
      saveSlackUserId(user.orcid, {
        userId: slackUser.authed_user.id,
        accessToken: slackUser.authed_user.access_token,
        scopes: slackUser.authed_user.scope,
      }),
    ),
    RTE.matchW(
      () => havingProblemsPage(locale),
      () => FlashMessageResponse({ message: 'slack-connected', location: format(myDetailsMatch.formatter, {}) }),
    ),
  )

export const connectSlackError = ({ error, locale }: { error: string; locale: SupportedLocale }): Response =>
  match(error)
    .with('access_denied', () => accessDeniedMessage(locale))
    .otherwise(() => failureMessage(locale))
