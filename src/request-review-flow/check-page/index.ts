import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags'
import { pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, type StreamlinePageResponse } from '../../response'
import { requestReviewMatch } from '../../routes'
import type { User } from '../../user'
import { checkPage } from './check-page'
import { failureMessage } from './failure-message'

export const requestReviewCheck = ({
  method,
  user,
}: {
  method: string
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv, LogInResponse | PageResponse | StreamlinePageResponse> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(({ user }) => canRequestReviews(user)),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.let('method', () => method),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, () => failureMessage)
          .with({ method: P.string }, checkPage)
          .exhaustive(),
    ),
  )
