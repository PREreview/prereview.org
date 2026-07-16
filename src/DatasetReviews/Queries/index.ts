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
import { GetPreviewForAReviewReadyToBePublished } from './GetPreviewForAReviewReadyToBePublished.ts'
import { GetPublishedReview } from './GetPublishedReview.ts'
import { GetPublishedReviewDetails } from './GetPublishedReviewDetails.ts'
import { GetZenodoRecordId } from './GetZenodoRecordId.ts'

export class DatasetReviewQueries extends Context.Tag('DatasetReviewQueries')<
  DatasetReviewQueries,
  {
    checkIfReviewIsBeingPublished: Queries.Query<
      (datasetReviewId: Uuid.Uuid) => ReturnType<typeof CheckIfReviewIsBeingPublished>,
      Errors.UnknownDatasetReview
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
>() {}

export const {
  checkIfReviewIsBeingPublished,
  checkIfUserCanRateTheQuality,
  checkIfUserCanAnswerIfTheDatasetFollowsFairAndCarePrinciples,
  checkIfUserCanAnswerIfTheDatasetHasDataCensoredOrDeleted,
  checkIfUserCanAnswerIfTheDatasetHasEnoughMetadata,
  checkIfUserCanAnswerIfTheDatasetHasTrackedChanges,
  checkIfUserCanAnswerIfTheDatasetIsAppropriateForThisKindOfResearch,
  checkIfUserCanAnswerIfTheDatasetSupportsRelatedConclusions,
  checkIfUserCanAnswerIfTheDatasetIsDetailedEnough,
  checkIfUserCanAnswerIfTheDatasetIsErrorFree,
  checkIfUserCanAnswerIfTheDatasetMattersToItsAudience,
  checkIfUserCanAnswerIfTheDatasetIsReadyToBeShared,
  checkIfUserCanAnswerIfTheDatasetIsMissingAnything,
  checkIfUserCanChoosePersona,
  checkIfUserCanAnswerIfOthersNeedToBeListedOnTheReview,
  checkIfUserCanAddInvitationToAppearOnADatasetReviewToTheList,
  checkIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList,
  checkIfUserCanDeclareCompetingInterests,
  checkIfUserCanDeclareFollowingCodeOfConduct,
  getPublishedReview,
  getPublishedReviewDetails,
  areThereMultipleAuthorsOnAReview,
  findInProgressReviewForADataset,
  findPublishedReviewsForADataset,
  getAuthor,
  getNextExpectedCommandForAUserOnADatasetReview,
  getListOfInvitationsToAppearOnADatasetReview,
  getPreviewForAReviewReadyToBePublished,
  getDataForZenodoRecord,
  getZenodoRecordId,
  getDatasetReviewForInvite,
} = Effect.serviceFunctions(DatasetReviewQueries)

export type { DataForZenodoRecord } from './GetDataForZenodoRecord.ts'

export type { DatasetReviewPreview } from './GetPreviewForAReviewReadyToBePublished.ts'

export type { PublishedReview } from './GetPublishedReview.ts'

export type { PublishedReviewDetails } from './GetPublishedReviewDetails.ts'

export type { NextExpectedCommand } from './GetNextExpectedCommandForAUserOnADatasetReview.ts'

export type { InvitationToAppear } from './GetListOfInvitationsToAppearOnADatasetReview.ts'

const makeDatasetReviewQueries: Effect.Effect<
  typeof DatasetReviewQueries.Service,
  never,
  EventStore.EventStore | EventDispatcher.EventDispatcher
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return {
    checkIfReviewIsBeingPublished: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return yield* CheckIfReviewIsBeingPublished(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
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
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: ['DatasetReviewWasStarted', 'PublicationOfDatasetReviewWasRequested', 'DatasetReviewWasPublished'],
          }),
        )

        return FindInProgressReviewForADataset(events)(...args)
      },
      Effect.catchTag('NoSuchElementException', () => Effect.succeedNone),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    findPublishedReviewsForADataset: Effect.fn(
      function* (...args) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: ['DatasetReviewWasStarted', 'DatasetReviewWasPublished'],
          }),
        )

        return FindPublishedReviewsForADataset(events)(...args)
      },
      Effect.catchTag('NoSuchElementException', () => Effect.sync(Array.empty)),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getAuthor: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return yield* GetAuthor(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getNextExpectedCommandForAUserOnADatasetReview: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return GetNextExpectedCommandForAUserOnADatasetReview(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getListOfInvitationsToAppearOnADatasetReview: yield* Queries.makeOnDemandQuery(
      GetListOfInvitationsToAppearOnADatasetReview,
    ),
    getPreviewForAReviewReadyToBePublished: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return yield* GetPreviewForAReviewReadyToBePublished(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getPublishedReview: yield* Queries.makeOnDemandQuery(GetPublishedReview),
    getPublishedReviewDetails: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return yield* GetPublishedReviewDetails(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getDataForZenodoRecord: yield* Queries.makeOnDemandQuery(GetDataForZenodoRecord),
    getZenodoRecordId: Effect.fn(
      function* (datasetReviewId) {
        const { events } = yield* Effect.flatten(
          EventStore.query({
            types: DatasetReviewEventTypes,
            predicates: { datasetReviewId },
          }),
        )

        return yield* GetZenodoRecordId(events)
      },
      Effect.catchTag('NoSuchElementException', cause => new Errors.UnknownDatasetReview({ cause })),
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    ),
    getDatasetReviewForInvite: yield* Queries.makeStatefulQuery(GetDatasetReviewForInvite),
  }
})

export const queriesLayer = Layer.effect(DatasetReviewQueries, makeDatasetReviewQueries)
