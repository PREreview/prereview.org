import { Array, Context, Effect, Layer, Scope } from 'effect'
import type * as EventDispatcher from '../../EventDispatcher.ts'
import * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import { DatasetReviewEventTypes } from '../Events.ts'
import { AreThereMultipleAuthorsOnAReview } from './AreThereMultipleAuthorsOnAReview.ts'
import { CheckIfReviewIsBeingPublished } from './CheckIfReviewIsBeingPublished.ts'
import { CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList } from './CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList.ts'
import { CheckIfUserCanAnswerIfOthersNeedToBeListedOnTheReview } from './CheckIfUserCanAnswerIfOthersNeedToBeListedOnTheReview.ts'
import * as CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples from './CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.ts'
import * as CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted from './CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.ts'
import * as CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata from './CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.ts'
import * as CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges from './CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.ts'
import * as CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch from './CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.ts'
import * as CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough from './CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough.ts'
import * as CheckIfUserCanAnswerIfTheDatasetIsErrorFree from './CheckIfUserCanAnswerIfTheDatasetIsErrorFree.ts'
import * as CheckIfUserCanAnswerIfTheDatasetIsMissingAnything from './CheckIfUserCanAnswerIfTheDatasetIsMissingAnything.ts'
import * as CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared from './CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared.ts'
import * as CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience from './CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience.ts'
import * as CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions from './CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.ts'
import * as CheckIfUserCanChoosePersona from './CheckIfUserCanChoosePersona.ts'
import * as CheckIfUserCanDeclareCompetingInterests from './CheckIfUserCanDeclareCompetingInterests.ts'
import { CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas } from './CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas.ts'
import * as CheckIfUserCanDeclareFollowingCodeOfConduct from './CheckIfUserCanDeclareFollowingCodeOfConduct.ts'
import * as CheckIfUserCanRateTheQuality from './CheckIfUserCanRateTheQuality.ts'
import { CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList } from './CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList.ts'
import { FindInProgressReviewForADataset } from './FindInProgressReviewForADataset.ts'
import { FindPublishedReviewsForADataset } from './FindPublishedReviewsForADataset.ts'
import { GetAuthor } from './GetAuthor.ts'
import { GetDataForZenodoRecord } from './GetDataForZenodoRecord.ts'
import { GetDatasetReviewForInvite } from './GetDatasetReviewForInvite.ts'
import { GetListOfInvitationsToAppearOnADatasetReview } from './GetListOfInvitationsToAppearOnADatasetReview.ts'
import { GetNextExpectedCommandForAUserOnADatasetReview } from './GetNextExpectedCommandForAUserOnADatasetReview.ts'
import { GetPreviousCommandForAUserOnADatasetReview } from './GetPreviousCommandForAUserOnADatasetReview.ts'
import { GetPreviewForAReviewReadyToBePublished } from './GetPreviewForAReviewReadyToBePublished.ts'
import { GetPublishedReview } from './GetPublishedReview.ts'
import { GetPublishedReviewDetails } from './GetPublishedReviewDetails.ts'
import { GetZenodoRecordId } from './GetZenodoRecordId.ts'

export class DatasetReviewQueries extends Context.Service<
  DatasetReviewQueries,
  {
    checkIfReviewIsBeingPublished: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof CheckIfReviewIsBeingPublished>
    >
    checkIfUserCanRateTheQuality: Queries.Query<
      (input: CheckIfUserCanRateTheQuality.Input) => CheckIfUserCanRateTheQuality.Result
    >
    checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.Result
    >
    checkIfUserCanAnswerIfTheDatasetHasTrackedChanges: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.Result
    >
    checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsDetailedEnough: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsErrorFree: Queries.Query<
      (input: CheckIfUserCanAnswerIfTheDatasetIsErrorFree.Input) => CheckIfUserCanAnswerIfTheDatasetIsErrorFree.Result
    >
    checkIfUserCanAnswerIfTheDatasetMattersToItsAudience: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared.Result
    >
    checkIfUserCanAnswerIfTheDatasetIsMissingAnything: Queries.Query<
      (
        input: CheckIfUserCanAnswerIfTheDatasetIsMissingAnything.Input,
      ) => CheckIfUserCanAnswerIfTheDatasetIsMissingAnything.Result
    >
    checkIfUserCanChoosePersona: Queries.Query<
      (input: CheckIfUserCanChoosePersona.Input) => CheckIfUserCanChoosePersona.Result
    >
    checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview: Queries.FromOnDemandQuery<
      typeof CheckIfUserCanAnswerIfOthersNeedToBeListedOnTheReview
    >
    checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList: Queries.FromOnDemandQuery<
      typeof CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList
    >
    checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList: Queries.FromOnDemandQuery<
      typeof CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList
    >
    checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: Queries.FromOnDemandQuery<
      typeof CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas
    >
    checkIfUserCanDeclareCompetingInterests: Queries.Query<
      (input: CheckIfUserCanDeclareCompetingInterests.Input) => CheckIfUserCanDeclareCompetingInterests.Result
    >
    checkIfUserCanDeclareFollowingCodeOfConduct: Queries.Query<
      (input: CheckIfUserCanDeclareFollowingCodeOfConduct.Input) => CheckIfUserCanDeclareFollowingCodeOfConduct.Result
    >
    areThereMultipleAuthorsOnAReview: Queries.FromOnDemandQuery<typeof AreThereMultipleAuthorsOnAReview>
    findInProgressReviewForADataset: Queries.Query<ReturnType<typeof FindInProgressReviewForADataset>>
    findPublishedReviewsForADataset: Queries.Query<ReturnType<typeof FindPublishedReviewsForADataset>>
    getAuthor: Queries.Query<(datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetAuthor>, Errors.UnknownDatasetReview>
    getNextExpectedCommandForAUserOnADatasetReview: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetNextExpectedCommandForAUserOnADatasetReview>,
      Errors.UnknownDatasetReview
    >
    getPreviousCommandForAUserOnADatasetReview: Queries.FromOnDemandQuery<
      typeof GetPreviousCommandForAUserOnADatasetReview
    >
    getListOfInvitationsToAppearOnADatasetReview: Queries.FromOnDemandQuery<
      typeof GetListOfInvitationsToAppearOnADatasetReview
    >
    getPreviewForAReviewReadyToBePublished: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetPreviewForAReviewReadyToBePublished>,
      Errors.UnknownDatasetReview
    >
    getPublishedReview: Queries.FromOnDemandQuery<typeof GetPublishedReview>
    getPublishedReviewDetails: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetPublishedReviewDetails>,
      Errors.UnknownDatasetReview
    >
    getDataForZenodoRecord: Queries.FromOnDemandQuery<typeof GetDataForZenodoRecord>
    getZenodoRecordId: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof GetZenodoRecordId>,
      Errors.UnknownDatasetReview
    >
    getDatasetReviewForInvite: Queries.FromStatefulQuery<typeof GetDatasetReviewForInvite>
  }
>()('DatasetReviewQueries') {}

export const checkIfReviewIsBeingPublished = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfReviewIsBeingPublished']>
) => DatasetReviewQueries.use(service => service.checkIfReviewIsBeingPublished(...args))

export const checkIfUserCanRateTheQuality = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanRateTheQuality']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanRateTheQuality(...args))

export const checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples = (
  ...args: Parameters<
    (typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples']
  >
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples(...args))

export const checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted(...args))

export const checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata(...args))

export const checkIfUserCanAnswerIfTheDatasetHasTrackedChanges = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetHasTrackedChanges']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetHasTrackedChanges(...args))

export const checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch = (
  ...args: Parameters<
    (typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch']
  >
) =>
  DatasetReviewQueries.use(service =>
    service.checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch(...args),
  )

export const checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions = (
  ...args: Parameters<
    (typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions']
  >
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions(...args))

export const checkIfUserCanAnswerIfTheDatasetIsDetailedEnough = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetIsDetailedEnough']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetIsDetailedEnough(...args))

export const checkIfUserCanAnswerIfTheDatasetIsErrorFree = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetIsErrorFree']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetIsErrorFree(...args))

export const checkIfUserCanAnswerIfTheDatasetMattersToItsAudience = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetMattersToItsAudience']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetMattersToItsAudience(...args))

export const checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared(...args))

export const checkIfUserCanAnswerIfTheDatasetIsMissingAnything = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfTheDatasetIsMissingAnything']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfTheDatasetIsMissingAnything(...args))

export const checkIfUserCanChoosePersona = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanChoosePersona']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanChoosePersona(...args))

export const checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview(...args))

export const checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList = (
  ...args: Parameters<
    (typeof DatasetReviewQueries.Service)['checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList']
  >
) => DatasetReviewQueries.use(service => service.checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList(...args))

export const checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList = (
  ...args: Parameters<
    (typeof DatasetReviewQueries.Service)['checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList']
  >
) =>
  DatasetReviewQueries.use(service =>
    service.checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList(...args),
  )

export const checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas(...args))

export const checkIfUserCanDeclareCompetingInterests = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanDeclareCompetingInterests']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanDeclareCompetingInterests(...args))

export const checkIfUserCanDeclareFollowingCodeOfConduct = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['checkIfUserCanDeclareFollowingCodeOfConduct']>
) => DatasetReviewQueries.use(service => service.checkIfUserCanDeclareFollowingCodeOfConduct(...args))

export const getPublishedReview = (...args: Parameters<(typeof DatasetReviewQueries.Service)['getPublishedReview']>) =>
  DatasetReviewQueries.use(service => service.getPublishedReview(...args))

export const getPublishedReviewDetails = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getPublishedReviewDetails']>
) => DatasetReviewQueries.use(service => service.getPublishedReviewDetails(...args))

export const areThereMultipleAuthorsOnAReview = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['areThereMultipleAuthorsOnAReview']>
) => DatasetReviewQueries.use(service => service.areThereMultipleAuthorsOnAReview(...args))

export const findInProgressReviewForADataset = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['findInProgressReviewForADataset']>
) => DatasetReviewQueries.use(service => service.findInProgressReviewForADataset(...args))

export const findPublishedReviewsForADataset = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['findPublishedReviewsForADataset']>
) => DatasetReviewQueries.use(service => service.findPublishedReviewsForADataset(...args))

export const getAuthor = (...args: Parameters<(typeof DatasetReviewQueries.Service)['getAuthor']>) =>
  DatasetReviewQueries.use(service => service.getAuthor(...args))

export const getNextExpectedCommandForAUserOnADatasetReview = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getNextExpectedCommandForAUserOnADatasetReview']>
) => DatasetReviewQueries.use(service => service.getNextExpectedCommandForAUserOnADatasetReview(...args))

export const getPreviousCommandForAUserOnADatasetReview = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getPreviousCommandForAUserOnADatasetReview']>
) => DatasetReviewQueries.use(service => service.getPreviousCommandForAUserOnADatasetReview(...args))

export const getListOfInvitationsToAppearOnADatasetReview = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getListOfInvitationsToAppearOnADatasetReview']>
) => DatasetReviewQueries.use(service => service.getListOfInvitationsToAppearOnADatasetReview(...args))

export const getPreviewForAReviewReadyToBePublished = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getPreviewForAReviewReadyToBePublished']>
) => DatasetReviewQueries.use(service => service.getPreviewForAReviewReadyToBePublished(...args))

export const getDataForZenodoRecord = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getDataForZenodoRecord']>
) => DatasetReviewQueries.use(service => service.getDataForZenodoRecord(...args))

export const getZenodoRecordId = (...args: Parameters<(typeof DatasetReviewQueries.Service)['getZenodoRecordId']>) =>
  DatasetReviewQueries.use(service => service.getZenodoRecordId(...args))

export const getDatasetReviewForInvite = (
  ...args: Parameters<(typeof DatasetReviewQueries.Service)['getDatasetReviewForInvite']>
) => DatasetReviewQueries.use(service => service.getDatasetReviewForInvite(...args))

export type { DataForZenodoRecord } from './GetDataForZenodoRecord.ts'

export type { DatasetReviewPreview } from './GetPreviewForAReviewReadyToBePublished.ts'

export type { PublishedReview } from './GetPublishedReview.ts'

export type { PublishedReviewDetails } from './GetPublishedReviewDetails.ts'

export type { NextExpectedCommand } from './GetNextExpectedCommandForAUserOnADatasetReview.ts'

export type { InvitationToAppear } from './GetListOfInvitationsToAppearOnADatasetReview.ts'

export type { UseOfAi } from './CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas.ts'

const makeDatasetReviewQueries: Effect.Effect<
  typeof DatasetReviewQueries.Service,
  never,
  EventStore.EventStore | EventDispatcher.EventDispatcher
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return {
    checkIfReviewIsBeingPublished: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfReviewIsBeingPublished',
      (datasetReviewId: Uuid.Uuid) => ({ types: DatasetReviewEventTypes, predicates: { datasetReviewId } }),
      CheckIfReviewIsBeingPublished,
    ),
    checkIfUserCanRateTheQuality: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanRateTheQuality',
      CheckIfUserCanRateTheQuality.createFilter,
      CheckIfUserCanRateTheQuality.query,
    ),
    checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples',
      CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.createFilter,
      CheckIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples.query,
    ),
    checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted',
      CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.createFilter,
      CheckIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted.query,
    ),
    checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata',
      CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.createFilter,
      CheckIfUserCanAnswerIfTheDatasetHasEnoughMetadata.query,
    ),
    checkIfUserCanAnswerIfTheDatasetHasTrackedChanges: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetHasTrackedChanges',
      CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.createFilter,
      CheckIfUserCanAnswerIfTheDatasetHasTrackedChanges.query,
    ),
    checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch',
      CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.createFilter,
      CheckIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch.query,
    ),
    checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions',
      CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.createFilter,
      CheckIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions.query,
    ),
    checkIfUserCanAnswerIfTheDatasetIsDetailedEnough: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetIsDetailedEnough',
      CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough.createFilter,
      CheckIfUserCanAnswerIfTheDatasetIsDetailedEnough.query,
    ),
    checkIfUserCanAnswerIfTheDatasetIsErrorFree: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetIsErrorFree',
      CheckIfUserCanAnswerIfTheDatasetIsErrorFree.createFilter,
      CheckIfUserCanAnswerIfTheDatasetIsErrorFree.query,
    ),
    checkIfUserCanAnswerIfTheDatasetMattersToItsAudience: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetMattersToItsAudience',
      CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience.createFilter,
      CheckIfUserCanAnswerIfTheDatasetMattersToItsAudience.query,
    ),
    checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared',
      CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared.createFilter,
      CheckIfUserCanAnswerIfTheDatasetIsReadyToBeShared.query,
    ),
    checkIfUserCanAnswerIfTheDatasetIsMissingAnything: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanAnswerIfTheDatasetIsMissingAnything',
      CheckIfUserCanAnswerIfTheDatasetIsMissingAnything.createFilter,
      CheckIfUserCanAnswerIfTheDatasetIsMissingAnything.query,
    ),
    checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview: yield* Queries.makeOnDemandQuery(
      CheckIfUserCanAnswerIfOthersNeedToBeListedOnTheReview,
    ),
    checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList: yield* Queries.makeOnDemandQuery(
      CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList,
    ),
    checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList: yield* Queries.makeOnDemandQuery(
      CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList,
    ),
    checkIfUserCanChoosePersona: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanChoosePersona',
      CheckIfUserCanChoosePersona.createFilter,
      CheckIfUserCanChoosePersona.query,
    ),
    checkIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas: yield* Queries.makeOnDemandQuery(
      CheckIfUserCanDeclareIfAiWasUsedToGenerateNewIdeas,
    ),
    checkIfUserCanDeclareCompetingInterests: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanDeclareCompetingInterests',
      CheckIfUserCanDeclareCompetingInterests.createFilter,
      CheckIfUserCanDeclareCompetingInterests.query,
    ),
    checkIfUserCanDeclareFollowingCodeOfConduct: yield* Queries.makeQuery(
      'DatasetReviewQueries.checkIfUserCanDeclareFollowingCodeOfConduct',
      CheckIfUserCanDeclareFollowingCodeOfConduct.createFilter,
      CheckIfUserCanDeclareFollowingCodeOfConduct.query,
    ),
    areThereMultipleAuthorsOnAReview: yield* Queries.makeOnDemandQuery(AreThereMultipleAuthorsOnAReview),
    findInProgressReviewForADataset: Effect.fn(
      function* (...args) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: ['DatasetReviewWasStarted', 'PublicationOfDatasetReviewWasRequested', 'DatasetReviewWasPublished'],
          }),
          Effect.fromOption,
        )

        return FindInProgressReviewForADataset(events)(...args)
      },
      Effect.catchTag('NoSuchElementError', () => Effect.succeedNone),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    findPublishedReviewsForADataset: Effect.fn(
      function* (...args) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: ['DatasetReviewWasStarted', 'DatasetReviewWasPublished'],
          }),
          Effect.fromOption,
        )

        return FindPublishedReviewsForADataset(events)(...args)
      },
      Effect.catchTag('NoSuchElementError', () => Effect.sync(Array.empty)),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getAuthor: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
          Effect.fromOption,
        )

        return yield* Effect.fromResult(GetAuthor(events))
      },
      Effect.catchTag('NoSuchElementError', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag(
        ['FailedToGetEvents', 'UnexpectedSequenceOfEvents'],
        cause => new Queries.UnableToQuery({ cause }),
      ),
      Effect.provide(context),
    ),
    getNextExpectedCommandForAUserOnADatasetReview: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
          Effect.fromOption,
        )

        return GetNextExpectedCommandForAUserOnADatasetReview(events)
      },
      Effect.catchTag('NoSuchElementError', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getPreviousCommandForAUserOnADatasetReview: yield* Queries.makeOnDemandQuery(
      GetPreviousCommandForAUserOnADatasetReview,
    ),
    getListOfInvitationsToAppearOnADatasetReview: yield* Queries.makeOnDemandQuery(
      GetListOfInvitationsToAppearOnADatasetReview,
    ),
    getPreviewForAReviewReadyToBePublished: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
          Effect.fromOption,
        )

        return yield* Effect.fromResult(GetPreviewForAReviewReadyToBePublished(events))
      },
      Effect.catchTag('NoSuchElementError', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag(
        ['FailedToGetEvents', 'UnexpectedSequenceOfEvents'],
        cause => new Queries.UnableToQuery({ cause }),
      ),
      Effect.provide(context),
    ),
    getPublishedReview: yield* Queries.makeOnDemandQuery(GetPublishedReview),
    getPublishedReviewDetails: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
          Effect.fromOption,
        )

        return yield* Effect.fromResult(GetPublishedReviewDetails(events))
      },
      Effect.catchTag('NoSuchElementError', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag(
        ['FailedToGetEvents', 'UnexpectedSequenceOfEvents'],
        cause => new Queries.UnableToQuery({ cause }),
      ),
      Effect.provide(context),
    ),
    getDataForZenodoRecord: yield* Queries.makeOnDemandQuery(GetDataForZenodoRecord),
    getZenodoRecordId: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatMap(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
          Effect.fromOption,
        )

        return yield* Effect.fromResult(GetZenodoRecordId(events))
      },
      Effect.catchTag('NoSuchElementError', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag(
        ['FailedToGetEvents', 'UnexpectedSequenceOfEvents'],
        cause => new Queries.UnableToQuery({ cause }),
      ),
      Effect.provide(context),
    ),
    getDatasetReviewForInvite: yield* Queries.makeStatefulQuery(GetDatasetReviewForInvite),
  }
})

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
