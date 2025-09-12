import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import type { FieldId } from '../types/field.js'
import { createEmptyPage, createPage } from './review-requests-page.js'
import { type GetReviewRequestsEnv, getReviewRequests } from './review-requests.js'

export {
  ReviewRequestsAreUnavailable,
  ReviewRequestsNotFound,
  type GetReviewRequestsEnv,
  type ReviewRequests,
} from './review-requests.js'

export const reviewRequests = ({
  field,
  language,
  locale,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  locale: SupportedLocale
  page: number
}): RT.ReaderTask<GetReviewRequestsEnv, PageResponse> =>
  pipe(
    getReviewRequests({ field, language, page }),
    RTE.let('locale', () => locale),
    RTE.matchW(
      error =>
        match(error._tag)
          .with('ReviewRequestsNotFound', () =>
            page === 1 ? createEmptyPage({ field, language, locale }) : pageNotFound(locale),
          )
          .with('ReviewRequestsAreUnavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      createPage,
    ),
  )
