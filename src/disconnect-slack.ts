import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { canConnectSlack } from './feature-flags'
import { setFlashMessage } from './flash-message'
import { html, plainText, sendHtml } from './html'
import { logInAndRedirect } from './log-in'
import { getMethod, notFound, seeOther, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { disconnectSlackMatch, myDetailsMatch } from './routes'
import { isSlackUser } from './slack-user'
import { deleteSlackUserId } from './slack-user-id'
import { type GetUserEnv, type User, getUser, maybeGetUser } from './user'

export const disconnectSlack = pipe(
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
  RM.apSW('method', RM.fromMiddleware(getMethod)),
  RM.ichainW(state =>
    match(state)
      .with({ method: 'POST', isSlackUser: true, user: { orcid: P.select() } }, handleDisconnectSlack)
      .with({ isSlackUser: true }, showDisconnectSlackPage)
      .with(
        { isSlackUser: false },
        RM.fromMiddlewareK(() => seeOther(format(myDetailsMatch.formatter, {}))),
      )
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
      .with('no-session', () => logInAndRedirect(disconnectSlackMatch.formatter, {}))
      .with(P.union('unavailable', P.instanceOf(Error)), () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showDisconnectSlackPage = flow(
  RM.fromReaderK(disconnectSlackPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
)

const handleDisconnectSlack = flow(
  RM.fromReaderTaskEitherK(deleteSlackUserId),
  RM.ichain(() => RM.status(Status.SeeOther)),
  RM.ichain(() => RM.header('Location', format(myDetailsMatch.formatter, {}))),
  RM.ichainMiddlewareKW(() => setFlashMessage('slack-disconnected')),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
  RM.orElseW(() => showFailureMessage),
)

const showFailureMessage = pipe(
  maybeGetUser,
  RM.chainReaderKW(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirst(() => RM.header('Cache-Control', 'no-store, must-revalidate')),
  RM.ichainMiddlewareK(sendHtml),
)

function disconnectSlackPage({ user }: { user: User }) {
  return page({
    title: plainText`Disconnect your Community Slack Account`,
    content: html`
      <main id="main-content">
        <form method="post" action="${format(disconnectSlackMatch.formatter, {})}" novalidate>
          <h1>Disconnect your Community Slack Account</h1>

          <p>You can disconnect your PREreview profile from your account on the PREreview Community Slack.</p>

          <p>You will be able to reconnect it at any time.</p>

          <button>Disconnect account</button>
        </form>
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

        <p>We’re unable to disconnect your account right now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}
