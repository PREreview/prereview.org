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
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import type { User } from '../../user'
import { requestReviewPage } from './request-review-page'

export const requestReview = ({
  preprint,
  user,
}: {
  preprint: IndeterminatePreprintId
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
    RTE.chainW(() => getPreprintTitle(preprint)),
    RTE.filterOrElseW(
      preprint =>
        match(preprint.id.type)
          .with('biorxiv', 'scielo', () => true)
          .otherwise(() => false),
      () => 'not-found' as const,
    ),
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
