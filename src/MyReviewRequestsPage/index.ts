import { Effect, pipe } from 'effect'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import * as Preprints from '../Preprints/index.ts'
import * as ReviewRequests from '../ReviewRequests/index.ts'
import { LoggedInUser } from '../user.ts'
import { MyReviewRequestsPage as createMyReviewRequestsPage, type ReviewRequest } from './MyReviewRequestsPage.ts'

export const MyReviewRequestsPage = Effect.gen(function* () {
  const user = yield* LoggedInUser

  const reviewRequests = yield* pipe(
    ReviewRequests.getPreprintsWithARecentReviewRequestsMatchingAPrereviewer({
      prereviewerId: user.orcid,
    }),
    Effect.andThen(Effect.forEach(ResultToReviewRequest, { concurrency: 'inherit' })),
  )

  return createMyReviewRequestsPage(reviewRequests)
}).pipe(Effect.catchAll(() => HavingProblemsPage))

const ResultToReviewRequest: (
  result: ReviewRequests.RecentReviewRequestMatchingAPrereviewer,
) => Effect.Effect<
  ReviewRequest,
  Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Preprints.Preprints
> = (result: ReviewRequests.RecentReviewRequestMatchingAPrereviewer) =>
  pipe(
    Effect.Do,
    Effect.let('published', () => result.lastRequested.toZonedDateTimeISO('UTC').toPlainDate()),
    Effect.bind('preprint', () => Preprints.getPreprintTitle(result.preprintId)),
  )
