import { Effect, Equal } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { CheckYourReviewPage as MakeResponse } from './CheckYourReviewPage.js'

export const CheckYourReviewPage = ({
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

    const review = yield* DatasetReviews.getPreviewForAReviewReadyToBePublished(datasetReviewId)

    return MakeResponse({ datasetReviewId, review })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasBeenPublished: () => HavingProblemsPage,
      DatasetReviewIsBeingPublished: () => HavingProblemsPage,
      DatasetReviewNotReadyToBePublished: () =>
        Effect.succeed(
          Response.RedirectResponse({
            location: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId }),
          }),
        ),
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
