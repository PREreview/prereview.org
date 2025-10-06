import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import { LoggedInUser } from '../../user.ts'
import { ReviewThisDatasetPage as MakeResponse } from './ReviewThisDatasetPage.ts'

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
        onSome: () =>
          Response.RedirectResponse({ location: Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id }) }),
      })
    },
    Effect.catchTags({
      DatasetIsNotFound: () => PageNotFound,
      DatasetIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
