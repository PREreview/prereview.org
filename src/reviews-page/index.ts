import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import { failureMessage } from './failure-message'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { createPage, emptyPage } from './reviews-page'

export { GetRecentPrereviewsEnv, RecentPrereviews } from './recent-prereviews'

export const reviewsPage = (currentPage: number): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews(currentPage),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (currentPage === 1 ? emptyPage : pageNotFound))
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )
