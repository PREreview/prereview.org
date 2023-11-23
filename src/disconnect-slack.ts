import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { html, plainText } from './html'
import { havingProblemsPage } from './http-error'
import { FlashMessageResponse, LogInResponse, PageResponse, RedirectResponse } from './response'
import { disconnectSlackMatch, myDetailsMatch } from './routes'
import { type IsSlackUserEnv, isSlackUser } from './slack-user'
import { type DeleteSlackUserIdEnv, deleteSlackUserId } from './slack-user-id'
import type { User } from './user'

export const disconnectSlack = ({
  method,
  user,
}: {
  method: string
  user?: User
}): RT.ReaderTask<
  DeleteSlackUserIdEnv & IsSlackUserEnv,
  PageResponse | LogInResponse | RedirectResponse | FlashMessageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('isSlackUser', ({ user }) => isSlackUser(user.orcid)),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(disconnectSlackMatch.formatter, {}) }))
            .with(P.union('unavailable', P.instanceOf(Error)), () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<RT.ReaderTask<DeleteSlackUserIdEnv, PageResponse | RedirectResponse | FlashMessageResponse>>()
          .with({ method: 'POST', isSlackUser: true, user: { orcid: P.select() } }, handleDisconnectSlack)
          .with({ isSlackUser: true }, () => RT.of(disconnectSlackPage))
          .with({ isSlackUser: false }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .exhaustive(),
    ),
  )

const handleDisconnectSlack = flow(
  deleteSlackUserId,
  RTE.matchW(
    () => failureMessage,
    () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'slack-disconnected' }),
  ),
)

const disconnectSlackPage = PageResponse({
  title: plainText`Disconnect your Community Slack Account`,
  main: html`
    <form method="post" action="${format(disconnectSlackMatch.formatter, {})}" novalidate>
      <h1>Disconnect your Community Slack Account</h1>

      <p>You can disconnect your PREreview profile from your account on the PREreview Community Slack.</p>

      <p>We’ll remove your ORCID iD from your Slack profile.</p>

      <p>You will be able to reconnect it at any time.</p>

      <button>Disconnect account</button>
    </form>
  `,
  canonical: format(disconnectSlackMatch.formatter, {}),
})

const failureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to disconnect your account right now.</p>

    <p>Please try again later.</p>
  `,
})
