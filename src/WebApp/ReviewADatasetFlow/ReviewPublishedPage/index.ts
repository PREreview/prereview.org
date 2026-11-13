import { Effect, Equal } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type * as Response from '../../Response/index.ts'
import { ReviewPublishedPage as MakeResponse } from './ReviewPublishedPage.ts'

export const ReviewPublishedPage: (input: {
  datasetReviewId: Uuid.Uuid
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.ReviewPublishedPage',
)(
  function* ({ datasetReviewId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    const datasetReview = yield* DatasetReviews.getPublishedReviewDetails(datasetReviewId)

    return MakeResponse({ datasetReview, locale })
  },
  Effect.catchTags({
    DatasetReviewIsBeingPublished: () => PageNotFound,
    DatasetReviewIsInProgress: () => PageNotFound,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
