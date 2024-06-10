import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error'
import type { PageResponse } from '../response'
import type { FieldId } from '../types/field'
import type { NonEmptyString } from '../types/string'
import { failureMessage } from './failure-message'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews'
import { createPage, emptyPage } from './reviews-page'

export { GetRecentPrereviewsEnv, RecentPrereviews } from './recent-prereviews'

export const reviewsPage = ({
  canUseSearchQueries,
  field,
  language,
  page,
  query,
}: {
  canUseSearchQueries: boolean
  field?: FieldId
  language?: LanguageCode
  page: number
  query?: NonEmptyString
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews({ field, language, page, query: canUseSearchQueries ? query : undefined }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () =>
            page === 1
              ? emptyPage({ field, language, query: canUseSearchQueries ? query : undefined }, canUseSearchQueries)
              : pageNotFound,
          )
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      prereviews => createPage(prereviews, canUseSearchQueries),
    ),
  )
