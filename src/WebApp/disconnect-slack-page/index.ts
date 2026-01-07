import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../locales/index.ts'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { disconnectSlackMatch, myDetailsMatch } from '../../routes.ts'
import { type DeleteSlackUserIdEnv, deleteSlackUserId } from '../../slack-user-id.ts'
import { type IsSlackUserEnv, isSlackUser } from '../../slack-user.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { disconnectSlackPage } from './disconnect-slack-page.ts'
import { failureMessage } from './failure-message.ts'

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

const handleDisconnectSlack = ({ locale, orcid }: { locale: SupportedLocale; orcid: OrcidId }) =>
  pipe(
    deleteSlackUserId(orcid),
    RTE.matchW(
      () => failureMessage(locale),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'slack-disconnected' }),
    ),
  )
