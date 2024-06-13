import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { PageResponse } from '../response.js'
import type { FieldId } from '../types/field.js'
import { createEmptyPage, createPage } from './review-requests-page.js'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests.js'

export { GetReviewRequestsEnv, ReviewRequests } from './review-requests.js'

export const reviewRequests = ({
  field,
  language,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  page: number
}): RT.ReaderTask<GetReviewRequestsEnv, PageResponse> =>
  pipe(
    getReviewRequests({ field, language, page }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (page === 1 ? createEmptyPage({ field, language }) : pageNotFound))
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      createPage,
    ),
  )
