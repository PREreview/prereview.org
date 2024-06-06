import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
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
  language,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  page: number
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews({ field, language, page }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (page === 1 ? emptyPage({ field, language }) : pageNotFound))
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      createPage,
    ),
  )
