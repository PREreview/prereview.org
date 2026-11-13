import { Effect, Option } from 'effect'
import { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../Domain/DatasetReviews/index.ts'
import * as Datasets from '../../../Domain/Datasets/index.ts'
import { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import { CarryOnPage } from './CarryOnPage.ts'

export const StartNow: ({
  datasetId,
}: {
  datasetId: Datasets.DatasetId
}) => Effect.Effect<
  Response.Response,
  never,
  | DatasetReviews.DatasetReviewCommands
  | DatasetReviews.DatasetReviewQueries
  | Datasets.Datasets
  | Locale
  | LoggedInUser
  | Uuid.GenerateUuid
> = Effect.fn('ReviewADatasetFlow.StartNow')(
  function* ({ datasetId }) {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const { dataset, reviewId } = yield* Effect.all({
      dataset: Datasets.getDatasetTitle(datasetId),
      reviewId: DatasetReviews.findInProgressReviewForADataset(user.orcid, datasetId),
    })

    return yield* Option.match(reviewId, {
      onNone: Effect.fnUntraced(
        function* () {
          const reviewId = yield* Uuid.v4()

          yield* DatasetReviews.startDatasetReview({ authorId: user.orcid, datasetId, datasetReviewId: reviewId })

          const nextExpectedCommand = yield* Effect.flatMap(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(reviewId),
            Effect.fromOption,
          )

          return Response.RedirectResponse({
            location: RouteForCommand(nextExpectedCommand).href({ datasetReviewId: reviewId }),
          })
        },
        Effect.catchTag(['UnknownDatasetReview', 'NoSuchElementError'], () => HavingProblemsPage),
      ),
      onSome: Effect.fnUntraced(
        function* (datasetReviewId) {
          const nextExpectedCommand = yield* Effect.flatMap(
            DatasetReviews.getNextExpectedCommandForAUserOnADatasetReview(datasetReviewId),
            Effect.fromOption,
          )

          return CarryOnPage({ dataset, datasetReviewId, locale, nextRoute: RouteForCommand(nextExpectedCommand) })
        },
        Effect.catchTag(['UnknownDatasetReview', 'NoSuchElementError'], () => HavingProblemsPage),
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
)
