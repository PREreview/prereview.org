import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../../locales/index.ts'
import type { FieldId } from '../../types/field.ts'
import { havingProblemsPage, pageNotFound } from '../http-error.ts'
import type { PageResponse } from '../Response/index.ts'
import { NoResultsPage } from './NoResultsPage.ts'
import { PageOfReviewRequests } from './PageOfReviewRequests.ts'
import { getReviewRequests, type GetReviewRequestsEnv } from './review-requests.ts'

export { type GetReviewRequestsEnv } from './review-requests.ts'

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
            page === 1 ? NoResultsPage({ field, language, locale }) : pageNotFound(locale),
          )
          .with('ReviewRequestsAreUnavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      PageOfReviewRequests,
    ),
  )
