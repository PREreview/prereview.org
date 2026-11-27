import { Effect, Equal } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import {
  ReviewBeingPublishedPage as MakeResponse,
  ReviewBeingPublishedPartial,
  ReviewPublishedPartial,
} from './ReviewBeingPublishedPage.ts'

export const ReviewBeingPublishedPage: (input: {
  datasetReviewId: Uuid.Uuid
  partial?: boolean
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser> = Effect.fn(
  'ReviewADatasetFlow.ReviewBeingPublishedPage',
)(
  function* ({ datasetReviewId, partial = false }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    yield* DatasetReviews.checkIfReviewIsBeingPublished(datasetReviewId)

    if (partial) {
      return ReviewBeingPublishedPartial({ locale })
    }

    return MakeResponse({ datasetReviewId, locale })
  },
  (effect, { datasetReviewId, partial = false }) =>
    Effect.catchTags(effect, {
      DatasetReviewHasBeenPublished: () =>
        partial
          ? Effect.map(Locale, locale => ReviewPublishedPartial({ datasetReviewId, locale }))
          : Effect.succeed(
              Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
            ),
      DatasetReviewIsInProgress: () => PageNotFound,
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
)
