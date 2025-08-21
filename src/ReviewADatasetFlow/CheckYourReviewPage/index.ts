import { Array, Effect, Equal, pipe } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { CheckYourReviewPage as MakeResponse } from './CheckYourReviewPage.js'

export const CheckYourReviewPage = ({
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

    const review = yield* DatasetReviews.getPreviewForAReviewReadyToBePublished(datasetReviewId)

    return MakeResponse({ datasetReviewId, review })
  }).pipe(
    Effect.catchTags({
      DatasetReviewHasBeenPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewIsBeingPublished: () =>
        Effect.succeed(
          Response.RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
        ),
      DatasetReviewNotReadyToBePublished: error =>
        Effect.succeed(
          Response.RedirectResponse({
            location: routeForMissing[Array.headNonEmpty(error.missing)].href({ datasetReviewId }),
          }),
        ),
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )

export const CheckYourReviewSubmission = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewCommands | DatasetReviews.DatasetReviewQueries | Locale | LoggedInUser
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    return yield* pipe(
      DatasetReviews.publishDatasetReview({ datasetReviewId }),
      Effect.andThen(
        Response.RedirectResponse({ location: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }) }),
      ),
      Effect.catchAll(() => HavingProblemsPage),
    )
  }).pipe(
    Effect.catchTags({
      UnableToQuery: () => HavingProblemsPage,
      UnknownDatasetReview: () => PageNotFound,
    }),
  )

const routeForMissing = {
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples: Routes.ReviewADatasetFollowsFairAndCarePrinciples,
  AnsweredIfTheDatasetHasEnoughMetadata: Routes.ReviewADatasetHasEnoughMetadata,
} satisfies Record<
  DatasetReviews.DatasetReviewNotReadyToBePublished['missing'][number],
  Routes.Route<{ datasetReviewId: Uuid.Uuid }>
>
