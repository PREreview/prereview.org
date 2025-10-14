import type * as DatasetReviews from '../DatasetReviews/index.ts'
import * as Routes from '../routes.ts'
import type { Uuid } from '../types/index.ts'

export const RouteForCommand = (
  command: DatasetReviews.NextExpectedCommand,
): Routes.Route<{ datasetReviewId: Uuid.Uuid }> => commandRoutes[command]

const commandRoutes = {
  RateTheQuality: Routes.ReviewADatasetRateTheQuality,
  AnswerIfTheDatasetFollowsFairAndCarePrinciples: Routes.ReviewADatasetFollowsFairAndCarePrinciples,
  AnswerIfTheDatasetHasEnoughMetadata: Routes.ReviewADatasetHasEnoughMetadata,
  AnswerIfTheDatasetHasTrackedChanges: Routes.ReviewADatasetHasTrackedChanges,
  AnswerIfTheDatasetHasDataCensoredOrDeleted: Routes.ReviewADatasetHasDataCensoredOrDeleted,
  AnswerIfTheDatasetIsAppropriateForThisKindOfResearch: Routes.ReviewADatasetIsAppropriateForThisKindOfResearch,
  AnswerIfTheDatasetSupportsRelatedConclusions: Routes.ReviewADatasetSupportsRelatedConclusions,
  AnswerIfTheDatasetIsDetailedEnough: Routes.ReviewADatasetIsDetailedEnough,
  AnswerIfTheDatasetIsErrorFree: Routes.ReviewADatasetIsErrorFree,
  AnswerIfTheDatasetMattersToItsAudience: Routes.ReviewADatasetMattersToItsAudience,
  AnswerIfTheDatasetIsReadyToBeShared: Routes.ReviewADatasetIsReadyToBeShared,
  AnswerIfTheDatasetIsMissingAnything: Routes.ReviewADatasetIsMissingAnything,
  ChoosePersona: Routes.ReviewADatasetChooseYourPersona,
  DeclareCompetingInterests: Routes.ReviewADatasetDeclareCompetingInterests,
  DeclareFollowingCodeOfConduct: Routes.ReviewADatasetDeclareFollowingCodeOfConduct,
  PublishDatasetReview: Routes.ReviewADatasetCheckYourReview,
} satisfies Record<DatasetReviews.NextExpectedCommand, Routes.Route<{ datasetReviewId: Uuid.Uuid }>>
