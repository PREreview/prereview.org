import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import type { FieldId } from '../types/field'
import { failureMessage } from './failure-message'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { createPage, emptyPage } from './reviews-page'

export { GetRecentPrereviewsEnv, RecentPrereviews } from './recent-prereviews'

export const reviewsPage = ({
  field,
  page,
}: {
  field?: FieldId
  page: number
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews({ field, page }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (page === 1 ? emptyPage({ field }) : pageNotFound))
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )
