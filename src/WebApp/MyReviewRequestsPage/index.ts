import { Array, Effect } from 'effect'
import { Locale } from '../../Context.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { ListOfReviewRequestsPage } from './ListOfReviewRequestsPage.ts'
import { NoReviewRequestsPage } from './NoReviewRequestsPage.ts'

export const MyReviewRequestsPage: Effect.Effect<
  PageResponse,
  never,
  ReviewRequests.ReviewRequests | Locale | LoggedInUser
> = Effect.gen(function* () {
  const user = yield* LoggedInUser
  const locale = yield* Locale

  const reviewRequests = yield* ReviewRequests.listForPrereviewer(user.orcid)

  return Array.match(reviewRequests, {
    onEmpty: () => NoReviewRequestsPage({ locale }),
    onNonEmpty: reviewRequests => ListOfReviewRequestsPage({ locale, reviewRequests }),
  })
}).pipe(
  Effect.catchTag('ReviewRequestsAreUnavailable', () => HavingProblemsPage),
  Effect.withSpan('MyReviewRequestsPage'),
)
