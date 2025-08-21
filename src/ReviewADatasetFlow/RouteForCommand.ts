import type * as DatasetReviews from '../DatasetReviews/index.js'
import * as Routes from '../routes.js'
import type { Uuid } from '../types/index.js'

export const RouteForCommand = (
  command: DatasetReviews.NextExpectedCommand,
): Routes.Route<{ datasetReviewId: Uuid.Uuid }> => commandRoutes[command]

const commandRoutes = {
  AnswerIfTheDatasetFollowsFairAndCarePrinciples: Routes.ReviewADatasetFollowsFairAndCarePrinciples,
  AnswerIfTheDatasetHasEnoughMetadata: Routes.ReviewADatasetHasEnoughMetadata,
  PublishDatasetReview: Routes.ReviewADatasetCheckYourReview,
} satisfies Record<DatasetReviews.NextExpectedCommand, Routes.Route<{ datasetReviewId: Uuid.Uuid }>>
