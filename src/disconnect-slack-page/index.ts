import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { disconnectSlackMatch, myDetailsMatch } from '../routes.js'
import { type DeleteSlackUserIdEnv, deleteSlackUserId } from '../slack-user-id.js'
import { type IsSlackUserEnv, isSlackUser } from '../slack-user.js'
import type { Orcid } from '../types/Orcid.js'
import type { User } from '../user.js'
import { disconnectSlackPage } from './disconnect-slack-page.js'
import { failureMessage } from './failure-message.js'

export const disconnectSlack = ({
  locale,
  method,
  user,
}: {
  locale: SupportedLocale
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
    RTE.let('locale', () => locale),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(disconnectSlackMatch.formatter, {}) }))
            .with(P.union('unavailable', P.instanceOf(Error)), () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<RT.ReaderTask<DeleteSlackUserIdEnv, PageResponse | RedirectResponse | FlashMessageResponse>>()
          .with(
            { method: 'POST', isSlackUser: true, user: { orcid: P.select('orcid') }, locale: P.select('locale') },
            handleDisconnectSlack,
          )
          .with({ isSlackUser: true, locale: P.select() }, locale => RT.of(disconnectSlackPage(locale)))
          .with({ isSlackUser: false }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .exhaustive(),
    ),
  )

const handleDisconnectSlack = ({ locale, orcid }: { locale: SupportedLocale; orcid: Orcid }) =>
  pipe(
    deleteSlackUserId(orcid),
    RTE.matchW(
      () => failureMessage(locale),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'slack-disconnected' }),
    ),
  )
