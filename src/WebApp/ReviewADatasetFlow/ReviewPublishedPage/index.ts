import { Effect, Equal } from 'effect'
import type { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type * as Response from '../../../Response/index.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { ReviewPublishedPage as MakeResponse } from './ReviewPublishedPage.ts'

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

    const datasetReview = yield* DatasetReviews.getPublishedReviewDetails(datasetReviewId)

    return MakeResponse({ datasetReview })
  }).pipe(
    Effect.catchTags({
      DatasetReviewIsBeingPublished: () => PageNotFound,
      DatasetReviewIsInProgress: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )
