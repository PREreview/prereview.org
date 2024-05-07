import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import { failureMessage } from './failure-message'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { createPage } from './reviews-page'

export { GetRecentPrereviewsEnv, RecentPrereviews } from './recent-prereviews'

export const reviewsPage: (currentPage: number) => RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> = flow(
  getRecentPrereviews,
  RTE.matchW(
    error =>
      match(error)
        .with('not-found', () => pageNotFound)
        .with('unavailable', () => failureMessage)
        .exhaustive(),
    createPage,
  ),
)
