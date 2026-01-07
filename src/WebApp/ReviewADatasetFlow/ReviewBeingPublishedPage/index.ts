import { Effect, Equal } from 'effect'
import type { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { ReviewBeingPublishedPage as MakeResponse } from './ReviewBeingPublishedPage.ts'

export const ReviewBeingPublishedPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    yield* DatasetReviews.checkIfReviewIsBeingPublished(datasetReviewId)

    return MakeResponse({ datasetReviewId })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewIsInProgress: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
