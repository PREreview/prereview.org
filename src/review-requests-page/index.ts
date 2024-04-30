import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { type CanSeeReviewRequestsEnv, canSeeReviewRequests } from '../feature-flags'
import { havingProblemsPage, pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import type { User } from '../user'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests'
import { createPage } from './review-requests-page'

export { GetReviewRequestsEnv, ReviewRequests } from './review-requests'

export const reviewRequests = ({
  page,
  user,
}: {
  page: number
  user?: User
}): RT.ReaderTask<CanSeeReviewRequestsEnv & GetReviewRequestsEnv, PageResponse> =>
  pipe(
    RTE.fromReader(canSeeReviewRequests(user)),
    RTE.filterOrElse(
      canSeeReviewRequests => canSeeReviewRequests,
      () => 'not-found' as const,
    ),
    RTE.chainW(() => getReviewRequests(page)),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      createPage,
    ),
  )
