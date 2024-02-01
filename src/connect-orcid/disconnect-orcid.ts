import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import { type DeleteOrcidTokenEnv, deleteOrcidToken, maybeGetOrcidToken } from '../orcid-token'
import { FlashMessageResponse, LogInResponse, type PageResponse, RedirectResponse } from '../response'
import { disconnectOrcidMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'
import { disconnectOrcidPage } from './disconnect-orcid-page'
import { disconnectFailureMessage } from './failure-message'

export const disconnectOrcid = ({ method, user }: { method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('orcidToken', ({ user }) => maybeGetOrcidToken(user.orcid)),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('no-session', () => LogInResponse({ location: format(disconnectOrcidMatch.formatter, {}) }))
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<RT.ReaderTask<DeleteOrcidTokenEnv, FlashMessageResponse | RedirectResponse | PageResponse>>()
          .with({ orcidToken: undefined }, () =>
            RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })),
          )
          .with({ method: 'POST' }, handleForm)
          .with({ method: P.string }, () => RT.of(disconnectOrcidPage))
          .exhaustive(),
    ),
  )

const handleForm = ({ user }: { user: User }) =>
  pipe(
    deleteOrcidToken(user.orcid),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => disconnectFailureMessage)
          .exhaustive(),
      () => FlashMessageResponse({ location: format(myDetailsMatch.formatter, {}), message: 'orcid-disconnected' }),
    ),
  )
