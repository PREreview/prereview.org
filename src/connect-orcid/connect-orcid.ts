import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { canConnectOrcidProfile } from '../feature-flags'
import { pageNotFound } from '../http-error'
import { LogInResponse } from '../response'
import { connectOrcidMatch } from '../routes'
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
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(connectOrcidMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      () => connectOrcidPage,
    ),
  )
