import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Doi, Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { CarryOnPage } from './CarryOnPage.js'

export const StartNow: Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser | Uuid.GenerateUuid
> = Effect.fn(
  function* () {
    const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
    const user = yield* LoggedInUser

    const reviewId = yield* DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId)

    return yield* Option.match(reviewId, {
      onNone: Effect.fn(function* () {
        const reviewId = yield* Uuid.generateUuid

        yield* DatasetReviews.startDatasetReview({ authorId: user.orcid, datasetId, datasetReviewId: reviewId })

        return Response.RedirectResponse({
          location: Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId: reviewId }),
        })
      }),
      onSome: datasetReviewId =>
        Effect.succeed(CarryOnPage({ datasetReviewId, nextRoute: Routes.ReviewADatasetFollowsFairAndCarePrinciples })),
    })
  },
  Effect.catchTags({
    DatasetReviewWasAlreadyStarted: () => HavingProblemsPage,
    UnableToHandleCommand: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
  }),
)()
