import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import type * as Response from '../../response.js'
import { Doi } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { ReviewThisDatasetPage as MakeResponse } from './ReviewThisDatasetPage.js'

export const ReviewThisDatasetPage: Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewQueries | Locale
> = Effect.fn(
  function* () {
    const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
    const user = yield* Effect.serviceOption(LoggedInUser)

    const reviewId = yield* Option.match(user, {
      onNone: () => Effect.succeedNone,
      onSome: user => DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId),
    })

    return yield* Option.match(reviewId, {
      onNone: () => Effect.sync(MakeResponse),
      onSome: () => HavingProblemsPage,
    })
  },
  Effect.catchTags({
    UnableToQuery: () => HavingProblemsPage,
  }),
)()
