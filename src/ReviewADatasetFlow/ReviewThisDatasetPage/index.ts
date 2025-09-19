import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { LoggedInUser } from '../../user.js'
import { ReviewThisDatasetPage as MakeResponse } from './ReviewThisDatasetPage.js'

export const ReviewThisDatasetPage: ({
  datasetId,
}: {
  datasetId: Datasets.DatasetId
}) => Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Datasets.Datasets | Locale> =
  Effect.fn(
    function* ({ datasetId }) {
      const user = yield* Effect.serviceOption(LoggedInUser)

      const { dataset, reviewId } = yield* Effect.all({
        dataset: Datasets.getDataset(datasetId),
        reviewId: Option.match(user, {
          onNone: () => Effect.succeedNone,
          onSome: user => DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId),
        }),
      })

      return Option.match(reviewId, {
        onNone: () => MakeResponse({ dataset, user }),
        onSome: () => Response.RedirectResponse({ location: Routes.ReviewThisDatasetStartNow }),
      })
    },
    Effect.catchTags({
      DatasetIsNotFound: () => PageNotFound,
      DatasetIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
