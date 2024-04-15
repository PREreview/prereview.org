import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags'
import { pageNotFound } from '../../http-error'
import { LogInResponse, type PageResponse, type StreamlinePageResponse } from '../../response'
import { requestReviewMatch } from '../../routes'
import type { User } from '../../user'
import { requestReviewPage } from './request-review-page'

export const requestReview = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv, LogInResponse | PageResponse | StreamlinePageResponse> =>
  pipe(
    RTE.fromNullable('no-session' as const)(user),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(canRequestReviews),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => 'not-found' as const,
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .exhaustive(),
      () => requestReviewPage,
    ),
  )
