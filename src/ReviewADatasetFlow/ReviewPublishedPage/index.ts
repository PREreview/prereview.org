import { Effect, Equal } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import type * as Response from '../../response.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { ReviewPublishedPage as MakeResponse } from './ReviewPublishedPage.js'

export const ReviewPublishedPage = ({
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

    const doi = yield* DatasetReviews.getPublishedDoi(datasetReviewId)

    return MakeResponse({ datasetReviewId, doi })
  }).pipe(
    Effect.catchTags({
      DatasetReviewIsBeingPublished: () => PageNotFound,
      DatasetReviewIsInProgress: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
