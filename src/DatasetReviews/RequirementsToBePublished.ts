import type { Types } from 'effect'
import type * as Events from './Events.ts'

export type RequirementToBePublished = (typeof RequirementsToBePublished)[number]

export const RequirementsToBePublished = [
  'RatedTheQualityOfTheDataset',
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  'AnsweredIfTheDatasetHasEnoughMetadata',
  'AnsweredIfTheDatasetHasTrackedChanges',
  'AnsweredIfTheDatasetHasDataCensoredOrDeleted',
  'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch',
  'AnsweredIfTheDatasetSupportsRelatedConclusions',
  'AnsweredIfTheDatasetIsDetailedEnough',
  'AnsweredIfTheDatasetMattersToItsAudience',
  'AnsweredIfTheDatasetIsErrorFree',
  'AnsweredIfTheDatasetIsReadyToBeShared',
  'AnsweredIfTheDatasetIsMissingAnything',
  'PersonaForDatasetReviewWasChosen',
  'AnsweredIfOthersNeedToBeListedOnTheReview',
  'DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview',
  'CompetingInterestsForADatasetReviewWereDeclared',
  'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
] as const satisfies ReadonlyArray<Types.Tags<Events.DatasetReviewEvent>>
