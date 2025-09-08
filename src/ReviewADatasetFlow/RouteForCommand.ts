import type * as DatasetReviews from '../DatasetReviews/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

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
  PublishDatasetReview: Routes.ReviewADatasetCheckYourReview,
} satisfies Record<DatasetReviews.NextExpectedCommand, Routes.Route<{ datasetReviewId: Uuid.Uuid }>>
