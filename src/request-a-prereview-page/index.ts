import { format } from 'fp-ts-routing'
import type * as R from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { LogInResponse, type PageResponse } from '../response'
import { requestAPrereviewMatch } from '../routes'
import type { User } from '../user'
import { requestAPrereviewPage } from './request-a-prereview-page'

export const requestAPrereview = ({
  method,
  user,
}: {
  method: string
  user?: User
}): R.Reader<CanRequestReviewsEnv, LogInResponse | PageResponse> =>
  pipe(
    RE.Do,
    RE.apS(
      'user',
      RE.liftNullable(
        () => user,
        () => 'no-session' as const,
      )(),
    ),
    RE.chainFirstW(
      flow(
        RE.fromReaderK(({ user }) => canRequestReviews(user)),
        RE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => 'not-found' as const,
        ),
      ),
    ),
    RE.let('method', () => method),
    RE.match(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(requestAPrereviewMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, () => havingProblemsPage)
          .otherwise(() => requestAPrereviewPage),
    ),
  )
