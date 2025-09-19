import { Array, Effect, Equal, Option, pipe } from 'effect'
import type { Locale } from '../../Context.js'
import * as DatasetReviews from '../../DatasetReviews/index.js'
import * as Datasets from '../../Datasets/index.js'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.js'
import { PageNotFound } from '../../PageNotFound/index.js'
import * as Personas from '../../Personas/index.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Doi, type Uuid } from '../../types/index.js'
import { LoggedInUser } from '../../user.js'
import { CheckYourReviewPage as MakeResponse } from './CheckYourReviewPage.js'

export const CheckYourReviewPage = ({
  datasetReviewId,
}: {
  datasetReviewId: Uuid.Uuid
}): Effect.Effect<
  Response.Response,
  never,
  DatasetReviews.DatasetReviewQueries | Datasets.Datasets | Locale | LoggedInUser | Personas.Personas
> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const author = yield* DatasetReviews.getAuthor(datasetReviewId)

    if (!Equal.equals(user.orcid, author)) {
      return yield* PageNotFound
    }

    const review = yield* DatasetReviews.getPreviewForAReviewReadyToBePublished(datasetReviewId)
    const { authorPersona, dataset } = yield* Effect.all({
      authorPersona: Option.match(review.author.persona, {
        onSome: persona => Effect.map(Personas.getPersona({ ...review.author, persona }), Option.some),
        onNone: () => Effect.succeedNone,
      }),
      dataset: Datasets.getDatasetTitle(new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })),
    })

    return MakeResponse({ datasetReviewId, review: { ...review, author: authorPersona, dataset } })
  }).pipe(
    Effect.catchTags({
      DatasetIsNotFound: () => HavingProblemsPage,
      DatasetIsUnavailable: () => HavingProblemsPage,
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
      UnableToGetPersona: () => HavingProblemsPage,
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
