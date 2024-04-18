import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../../feature-flags'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { type GetReviewRequestEnv, maybeGetReviewRequest } from '../../review-request'
import { requestReviewMatch, requestReviewStartMatch } from '../../routes'
import type { User } from '../../user'
import { requestReviewPage } from './request-review-page'

export const requestReview = ({
  user,
}: {
  user?: User
}): RT.ReaderTask<
  CanRequestReviewsEnv & GetPreprintTitleEnv & GetReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
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
    RTE.chainFirstW(
      flow(
        user => maybeGetReviewRequest(user.orcid),
        RTE.chainW(reviewRequest =>
          match(reviewRequest)
            .with({ status: P.string }, () => RTE.left('already-started' as const))
            .with(undefined, RTE.right)
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainW(() => getPreprintTitle({ type: 'biorxiv', value: '10.1101/2024.02.07.578830' as Doi<'1101'> })),
    RTE.matchW(
      error =>
        match(error)
          .with('already-started', () => RedirectResponse({ location: format(requestReviewStartMatch.formatter, {}) }))
          .with('no-session', () => LogInResponse({ location: format(requestReviewMatch.formatter, {}) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      requestReviewPage,
    ),
  )
