import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { canConnectOrcidProfile } from '../feature-flags'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { maybeGetOrcidToken } from '../orcid-token'
import { LogInResponse, RedirectResponse } from '../response'
import { connectOrcidMatch, connectOrcidStartMatch } from '../routes'
import type { User } from '../user'
import { connectOrcidPage } from './connect-orcid-page'

export const connectOrcid = ({ user }: { user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW(
      'canConnectOrcidProfile',
      flow(
        RTE.fromReaderK(({ user }) => canConnectOrcidProfile(user)),
        RTE.filterOrElse(
          canConnectOrcidProfile => canConnectOrcidProfile,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.bindW('orcidToken', ({ user }) => maybeGetOrcidToken(user.orcid)),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      ({ orcidToken }) =>
        match(orcidToken)
          .with(P.not(undefined), () => RedirectResponse({ location: format(connectOrcidStartMatch.formatter, {}) }))
          .with(undefined, () => connectOrcidPage)
          .exhaustive(),
    ),
  )
