import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error'
import { maybeGetOrcidToken } from '../orcid-token'
import { LogInResponse, RedirectResponse } from '../response'
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
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(disconnectOrcidMatch.formatter, {}) }))
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      state =>
        match(state)
          .with({ orcidToken: undefined }, () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }))
          .with({ method: 'POST' }, () => disconnectFailureMessage)
          .with({ method: P.string }, () => disconnectOrcidPage)
          .exhaustive(),
    ),
  )
