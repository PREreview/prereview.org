import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests'
import { createPage } from './review-requests-page'

export { GetReviewRequestsEnv, ReviewRequests } from './review-requests'

export const reviewRequests = ({ page }: { page: number }): RT.ReaderTask<GetReviewRequestsEnv, PageResponse> =>
  pipe(
    getReviewRequests(page),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      createPage,
    ),
  )
