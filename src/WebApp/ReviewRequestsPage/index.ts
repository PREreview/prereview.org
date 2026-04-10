import { Effect } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { Locale } from '../../Context.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import type { FieldId } from '../../types/field.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { NoResultsPage } from './NoResultsPage.ts'
import { PageOfReviewRequests } from './PageOfReviewRequests.ts'

export const ReviewRequestsPage: (query: {
  field?: FieldId
  language?: LanguageCode
  page: number
}) => Effect.Effect<PageResponse, never, ReviewRequests.ReviewRequests | Locale> = Effect.fn('ReviewRequestsPage')(
  function* ({ field, language, page }) {
    const locale = yield* Locale

    const reviewRequests = yield* ReviewRequests.search({ field, language, page })

    return PageOfReviewRequests({ ...reviewRequests, locale })
  },
  (response, { field, language, page }) =>
    Effect.catchIf(
      response,
      error => error._tag === 'ReviewRequestsNotFound' && page === 1,
      Effect.fnUntraced(function* () {
        const locale = yield* Locale

        return NoResultsPage({ field, language, locale })
      }),
    ),
  Effect.catchTags({
    ReviewRequestsNotFound: () => PageNotFound,
    ReviewRequestsAreUnavailable: () => HavingProblemsPage,
  }),
)
