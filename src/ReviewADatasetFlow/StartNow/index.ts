import { Effect, Option } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import { Doi, Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { RouteForCommand } from '../RouteForCommand.js'
import { CarryOnPage } from './CarryOnPage.js'

export const StartNow: Effect.Effect<
  Response.Response,
  never,
  | DatasetReviews.DatasetReviewCommands
  | DatasetReviews.DatasetReviewQueries
  | Datasets.Datasets
  | Locale
  | LoggedInUser
  | Uuid.GenerateUuid
> = Effect.fn(
  function* () {
    const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
    const user = yield* LoggedInUser

    const { dataset, reviewId } = yield* Effect.all({
      dataset: Datasets.getDatasetTitle(datasetId),
      reviewId: DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId),
    })

    return yield* Option.match(reviewId, {
      onNone: Effect.fn(
        function* () {
          const reviewId = yield* Uuid.generateUuid

          yield* DatasetReviews.startDatasetReview({ authorId: user.orcid, datasetId, datasetReviewId: reviewId })

          const nextExpectedCommand = yield* Effect.flatten(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(reviewId),
          )

          return Response.RedirectResponse({
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId: reviewId }),
          })
        },
        Effect.catchTag('UnknownDatasetReview', 'NoSuchElementException', () => HavingProblemsPage),
      ),
      onSome: Effect.fn(
        function* (datasetReviewId) {
          const nextExpectedCommand = yield* Effect.flatten(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
          )

          return CarryOnPage({ dataset, datasetReviewId, nextRoute: RouteForCommand(nextExpectedCommand) })
        },
        Effect.catchTag('UnknownDatasetReview', 'NoSuchElementException', () => HavingProblemsPage),
      ),
    })
  },
  Effect.catchTags({
    DatasetIsNotFound: () => PageNotFound,
    DatasetIsUnavailable: () => HavingProblemsPage,
    DatasetReviewWasAlreadyStarted: () => HavingProblemsPage,
    NotAuthorizedToRunCommand: () => HavingProblemsPage,
    UnableToHandleCommand: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
  }),
)()
