import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { PageResponse } from '../response.js'
import type { FieldId } from '../types/field.js'
import { createEmptyPage, createPage } from './review-requests-page.js'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests.js'

export type { GetReviewRequestsEnv, ReviewRequests } from './review-requests.js'

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
