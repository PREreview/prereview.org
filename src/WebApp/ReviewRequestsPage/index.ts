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
import { isServer, registrantsForServer } from './Servers.ts'

export const ReviewRequestsPage: (query: {
  field?: FieldId
  language?: LanguageCode
  page: number
  server?: string
}) => Effect.Effect<PageResponse, never, ReviewRequests.ReviewRequests | Locale> = Effect.fn('ReviewRequestsPage')(
  function* ({ field, language, page, server }) {
    const locale = yield* Locale

    if (typeof server === 'string' && !isServer(server)) {
      return yield* PageNotFound
    }

    const reviewRequests = yield* ReviewRequests.search({
      field,
      language,
      page,
      doiRegistrants: server ? registrantsForServer(server) : undefined,
    })

    return PageOfReviewRequests({ ...reviewRequests, locale, server })
  },
  (response, { field, language, page, server }) =>
    Effect.catchIf(
      response,
      error => error._tag === 'ReviewRequestsNotFound' && page === 1,
      Effect.fnUntraced(function* () {
        const locale = yield* Locale

        if (typeof server === 'string' && !isServer(server)) {
          return yield* PageNotFound
        }

        return NoResultsPage({ field, language, locale, server })
      }),
    ),
  Effect.catchTags({
    ReviewRequestsNotFound: () => PageNotFound,
    ReviewRequestsAreUnavailable: () => HavingProblemsPage,
  }),
)
