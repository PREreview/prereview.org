import { Array, Either, type Types } from 'effect'
import type * as Events from './Events.ts'

export type RequirementToBePublished = (typeof RequirementsToBePublished)[number]

export type EventsRequiredToBePublished = {
  readonly [Requirement in RequirementToBePublished]: Types.ExtractTag<Events.DatasetReviewEvent, Requirement>
}

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

export const FindRequirementsToBePublished = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<EventsRequiredToBePublished, Array.NonEmptyReadonlyArray<RequirementToBePublished>> => {
  const requirements = Array.map(RequirementsToBePublished, requirement =>
    Either.fromOption(
      Array.findLast(events, event => event._tag === requirement),
      () => requirement,
    ),
  )

  const missing = Array.getLefts(requirements)

  if (Array.isNonEmptyReadonlyArray(missing)) {
    return Either.left(missing)
  }

  return Either.right(
    Object.fromEntries(
      Array.map(Array.getRights(requirements), event => [event._tag, event]),
    ) as EventsRequiredToBePublished,
  )
}
