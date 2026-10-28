import { Array, Either, HashSet, Option, Struct, type Types } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/index.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import * as Errors from '../Errors.ts'
import { FindRequirementsToBePublished } from '../RequirementsToBePublished.ts'
import type * as Events from '../Events.ts'

export interface DatasetReviewPreview {
  readonly author: {
    readonly orcidId: OrcidId.OrcidId
    readonly persona: Events.PersonaForDatasetReviewWasChosen['persona']
  }
  readonly authorsToInvite: Option.Option<Array.NonEmptyReadonlyArray<NonEmptyString>>
  readonly dataset: Datasets.DatasetId
  readonly competingInterests: Events.CompetingInterestsForADatasetReviewWereDeclared['competingInterests']
  readonly qualityRating: Pick<Events.RatedTheQualityOfTheDataset, 'rating' | 'detail'>
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Pick<
    Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetHasEnoughMetadata: Pick<
    Events.AnsweredIfTheDatasetHasEnoughMetadata,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetHasTrackedChanges: Pick<
    Events.AnsweredIfTheDatasetHasTrackedChanges,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetHasDataCensoredOrDeleted: Pick<
    Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Pick<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetSupportsRelatedConclusions: Pick<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetIsDetailedEnough: Pick<Events.AnsweredIfTheDatasetIsDetailedEnough, 'answer' | 'detail'>
  readonly answerToIfTheDatasetIsErrorFree: Pick<Events.AnsweredIfTheDatasetIsErrorFree, 'answer' | 'detail'>
  readonly answerToIfTheDatasetMattersToItsAudience: Pick<
    Events.AnsweredIfTheDatasetMattersToItsAudience,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetIsReadyToBeShared: Pick<
    Events.AnsweredIfTheDatasetIsReadyToBeShared,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetIsMissingAnything: Events.AnsweredIfTheDatasetIsMissingAnything['answer']
  readonly generativeAiIdeas: Events.DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview['generativeAiIdeas']
  readonly license: 'CC-BY-4.0' | 'CC0-1.0'
}

export const GetPreviewForAReviewReadyToBePublished = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  DatasetReviewPreview,
  | Errors.DatasetReviewNotReadyToBePublished
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Queries.UnexpectedSequenceOfEvents
> => {
  const started = Option.getOrUndefined(Array.findLast(events, hasTag('DatasetReviewWasStarted')))

  if (!started) {
    return Either.left(new Queries.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    return Either.left(new Errors.DatasetReviewHasBeenPublished())
  }

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsBeingPublished())
  }

  const requirements = FindRequirementsToBePublished(events)

  if (Either.isLeft(requirements)) {
    return Either.left(new Errors.DatasetReviewNotReadyToBePublished({ missing: requirements.left }))
  }

  const {
    PersonaForDatasetReviewWasChosen: author,
    AnsweredIfOthersNeedToBeListedOnTheReview: othersNeedToBeListed,
    CompetingInterestsForADatasetReviewWereDeclared: competingInterests,
    RatedTheQualityOfTheDataset: qualityRating,
    AnsweredIfTheDatasetFollowsFairAndCarePrinciples: answerToIfTheDatasetFollowsFairAndCarePrinciples,
    AnsweredIfTheDatasetHasEnoughMetadata: answerToIfTheDatasetHasEnoughMetadata,
    AnsweredIfTheDatasetHasTrackedChanges: answerToIfTheDatasetHasTrackedChanges,
    AnsweredIfTheDatasetHasDataCensoredOrDeleted: answerToIfTheDatasetHasDataCensoredOrDeleted,
    AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch: answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
    AnsweredIfTheDatasetSupportsRelatedConclusions: answerToIfTheDatasetSupportsRelatedConclusions,
    AnsweredIfTheDatasetIsDetailedEnough: answerToIfTheDatasetIsDetailedEnough,
    AnsweredIfTheDatasetIsErrorFree: answerToIfTheDatasetIsErrorFree,
    AnsweredIfTheDatasetMattersToItsAudience: answerToIfTheDatasetMattersToItsAudience,
    AnsweredIfTheDatasetIsReadyToBeShared: answerToIfTheDatasetIsReadyToBeShared,
    AnsweredIfTheDatasetIsMissingAnything: answerToIfTheDatasetIsMissingAnything,
    DeclaredIfAiWasUsedToGenerateNewIdeasForADatasetReview: { generativeAiIdeas },
  } = requirements.right

  return Either.right({
    author: { orcidId: started.authorId, persona: author.persona },
    authorsToInvite: authorsToInviteFor(othersNeedToBeListed.answer, events),
    dataset: started.datasetId,
    competingInterests: competingInterests.competingInterests,
    qualityRating: Struct.pick(qualityRating, 'rating', 'detail'),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: Struct.pick(
      answerToIfTheDatasetFollowsFairAndCarePrinciples,
      'answer',
      'detail',
    ),
    answerToIfTheDatasetHasEnoughMetadata: Struct.pick(answerToIfTheDatasetHasEnoughMetadata, 'answer', 'detail'),
    answerToIfTheDatasetHasTrackedChanges: Struct.pick(answerToIfTheDatasetHasTrackedChanges, 'answer', 'detail'),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Struct.pick(
      answerToIfTheDatasetHasDataCensoredOrDeleted,
      'answer',
      'detail',
    ),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Struct.pick(
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
      'answer',
      'detail',
    ),
    answerToIfTheDatasetSupportsRelatedConclusions: Struct.pick(
      answerToIfTheDatasetSupportsRelatedConclusions,
      'answer',
      'detail',
    ),
    answerToIfTheDatasetIsDetailedEnough: Struct.pick(answerToIfTheDatasetIsDetailedEnough, 'answer', 'detail'),
    answerToIfTheDatasetIsErrorFree: Struct.pick(answerToIfTheDatasetIsErrorFree, 'answer', 'detail'),
    answerToIfTheDatasetMattersToItsAudience: Struct.pick(answerToIfTheDatasetMattersToItsAudience, 'answer', 'detail'),
    answerToIfTheDatasetIsReadyToBeShared: Struct.pick(answerToIfTheDatasetIsReadyToBeShared, 'answer', 'detail'),
    answerToIfTheDatasetIsMissingAnything: answerToIfTheDatasetIsMissingAnything.answer,
    generativeAiIdeas,
    license: generativeAiIdeas.answer === 'yes' ? 'CC0-1.0' : 'CC-BY-4.0',
  })
}

const authorsToInviteFor = (
  othersNeedToBeListed: Events.AnsweredIfOthersNeedToBeListedOnTheReview['answer'],
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): DatasetReviewPreview['authorsToInvite'] => {
  if (othersNeedToBeListed === 'no') {
    return Option.none()
  }

  const addedInvitations = Array.filter(events, hasTag('InvitationToAppearOnADatasetReviewAddedToTheList'))

  const removedInvitations = HashSet.fromIterable(
    Array.filterMap(events, event =>
      event._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList'
        ? Option.some(event.invitationId)
        : Option.none(),
    ),
  )

  const currentInvitations = Array.filter(
    addedInvitations,
    invitation => !HashSet.has(removedInvitations, invitation.invitationId),
  )

  return Option.liftPredicate(
    Array.filterMap(currentInvitations, invitation =>
      Option.isSome(invitation.contactDetails) ? Option.some(invitation.contactDetails.value.name) : Option.none(),
    ),
    Array.isNonEmptyArray,
  )
}

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  tag: Types.Tags<Events.DatasetReviewEvent>,
): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
