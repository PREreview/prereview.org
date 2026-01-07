import { Array, Effect, Equal, Option, pipe } from 'effect'
import type { Locale } from '../../../Context.ts'
import * as DatasetReviews from '../../../DatasetReviews/index.ts'
import * as Datasets from '../../../Datasets/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Response from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { CheckYourReviewPage as MakeResponse } from './CheckYourReviewPage.ts'

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
      dataset: Datasets.getDatasetTitle(review.dataset),
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
  RatedTheQualityOfTheDataset: Routes.ReviewADatasetRateTheQuality,
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples: Routes.ReviewADatasetFollowsFairAndCarePrinciples,
  AnsweredIfTheDatasetHasEnoughMetadata: Routes.ReviewADatasetHasEnoughMetadata,
  AnsweredIfTheDatasetHasTrackedChanges: Routes.ReviewADatasetHasTrackedChanges,
  AnsweredIfTheDatasetHasDataCensoredOrDeleted: Routes.ReviewADatasetHasDataCensoredOrDeleted,
  AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch: Routes.ReviewADatasetIsAppropriateForThisKindOfResearch,
  AnsweredIfTheDatasetSupportsRelatedConclusions: Routes.ReviewADatasetSupportsRelatedConclusions,
  AnsweredIfTheDatasetIsDetailedEnough: Routes.ReviewADatasetIsDetailedEnough,
  AnsweredIfTheDatasetMattersToItsAudience: Routes.ReviewADatasetMattersToItsAudience,
  AnsweredIfTheDatasetIsErrorFree: Routes.ReviewADatasetIsErrorFree,
  AnsweredIfTheDatasetIsReadyToBeShared: Routes.ReviewADatasetIsReadyToBeShared,
  AnsweredIfTheDatasetIsMissingAnything: Routes.ReviewADatasetIsMissingAnything,
  PersonaForDatasetReviewWasChosen: Routes.ReviewADatasetChooseYourPersona,
  CompetingInterestsForADatasetReviewWereDeclared: Routes.ReviewADatasetDeclareCompetingInterests,
  DeclaredThatTheCodeOfConductWasFollowedForADatasetReview: Routes.ReviewADatasetDeclareCompetingInterests,
} satisfies Record<
  DatasetReviews.DatasetReviewNotReadyToBePublished['missing'][number],
  Routes.Route<{ datasetReviewId: Uuid.Uuid }>
>
