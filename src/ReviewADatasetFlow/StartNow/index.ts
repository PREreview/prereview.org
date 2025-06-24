import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Doi } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { CarryOnPage } from './CarryOnPage.js'

export const StartNow: Effect.Effect<Response.Response, never, DatasetReviews.DatasetReviewQueries | Locale> =
  Effect.fn(
    function* () {
      const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
      const user = yield* EnsureUserIsLoggedIn

      const reviewId = yield* DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId)

      return yield* Option.match(reviewId, {
        onNone: () => HavingProblemsPage,
        onSome: () => Effect.sync(CarryOnPage),
      })
    },
    Effect.catchTags({
      UserIsNotLoggedIn: () => Effect.succeed(Response.LogInResponse({ location: Routes.ReviewThisDatasetStartNow })),
    }),
    Effect.orElse(() => HavingProblemsPage),
  )()
