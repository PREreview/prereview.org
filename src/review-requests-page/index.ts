import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests'
import { createEmptyPage, createPage } from './review-requests-page'

export { GetReviewRequestsEnv, ReviewRequests } from './review-requests'

export const reviewRequests = ({
  language,
  page,
}: {
  language?: LanguageCode
  page: number
}): RT.ReaderTask<GetReviewRequestsEnv, PageResponse> =>
  pipe(
    getReviewRequests({ language, page }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (page === 1 ? createEmptyPage({ language }) : pageNotFound))
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      createPage,
    ),
  )
