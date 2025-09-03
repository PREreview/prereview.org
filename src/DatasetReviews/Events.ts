import { Array, Schema, Struct } from 'effect'
import * as Datasets from '../Datasets/index.js'
import { Doi, NonEmptyString, Orcid, Temporal, Uuid } from '../types/index.js'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: Orcid.OrcidSchema,
  datasetId: Datasets.DatasetIdFromString,
  datasetReviewId: Uuid.UuidSchema,
}) {}

export class RatedTheQualityOfTheDataset extends Schema.TaggedClass<RatedTheQualityOfTheDataset>()(
  'RatedTheQualityOfTheDataset',
  { rating: Schema.Literal('excellent', 'fair', 'poor', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetFollowsFairAndCarePrinciples extends Schema.TaggedClass<AnsweredIfTheDatasetFollowsFairAndCarePrinciples>()(
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetHasEnoughMetadata extends Schema.TaggedClass<AnsweredIfTheDatasetHasEnoughMetadata>()(
  'AnsweredIfTheDatasetHasEnoughMetadata',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetHasTrackedChanges extends Schema.TaggedClass<AnsweredIfTheDatasetHasTrackedChanges>()(
  'AnsweredIfTheDatasetHasTrackedChanges',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetHasDataCensoredOrDeleted extends Schema.TaggedClass<AnsweredIfTheDatasetHasDataCensoredOrDeleted>()(
  'AnsweredIfTheDatasetHasDataCensoredOrDeleted',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch extends Schema.TaggedClass<AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch>()(
  'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetSupportsRelatedConclusions extends Schema.TaggedClass<AnsweredIfTheDatasetSupportsRelatedConclusions>()(
  'AnsweredIfTheDatasetSupportsRelatedConclusions',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetIsErrorFree extends Schema.TaggedClass<AnsweredIfTheDatasetIsErrorFree>()(
  'AnsweredIfTheDatasetIsErrorFree',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetIsDetailedEnough extends Schema.TaggedClass<AnsweredIfTheDatasetIsDetailedEnough>()(
  'AnsweredIfTheDatasetIsDetailedEnough',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetIsReadyToBeShared extends Schema.TaggedClass<AnsweredIfTheDatasetIsReadyToBeShared>()(
  'AnsweredIfTheDatasetIsReadyToBeShared',
  { answer: Schema.Literal('yes', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
) {}

export class AnsweredIfTheDatasetIsMissingAnything extends Schema.TaggedClass<AnsweredIfTheDatasetIsMissingAnything>()(
  'AnsweredIfTheDatasetIsMissingAnything',
  { answer: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema), datasetReviewId: Uuid.UuidSchema },
) {}

export class PublicationOfDatasetReviewWasRequested extends Schema.TaggedClass<PublicationOfDatasetReviewWasRequested>()(
  'PublicationOfDatasetReviewWasRequested',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export class ZenodoRecordForDatasetReviewWasCreated extends Schema.TaggedClass<ZenodoRecordForDatasetReviewWasCreated>()(
  'ZenodoRecordForDatasetReviewWasCreated',
  {
    recordId: Schema.Number,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasAssignedADoi extends Schema.TaggedClass<DatasetReviewWasAssignedADoi>()(
  'DatasetReviewWasAssignedADoi',
  {
    doi: Doi.DoiSchema,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasPublished extends Schema.TaggedClass<DatasetReviewWasPublished>()(
  'DatasetReviewWasPublished',
  { datasetReviewId: Uuid.UuidSchema, publicationDate: Temporal.PlainDateSchema },
) {}

export class ZenodoRecordForDatasetReviewWasPublished extends Schema.TaggedClass<ZenodoRecordForDatasetReviewWasPublished>()(
  'ZenodoRecordForDatasetReviewWasPublished',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export class DatasetReviewDoiWasActivated extends Schema.TaggedClass<DatasetReviewDoiWasActivated>()(
  'DatasetReviewDoiWasActivated',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export const DatasetReviewEvent = Schema.Union(
  DatasetReviewWasStarted,
  RatedTheQualityOfTheDataset,
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
  AnsweredIfTheDatasetHasEnoughMetadata,
  AnsweredIfTheDatasetHasTrackedChanges,
  AnsweredIfTheDatasetHasDataCensoredOrDeleted,
  AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch,
  AnsweredIfTheDatasetSupportsRelatedConclusions,
  AnsweredIfTheDatasetIsDetailedEnough,
  AnsweredIfTheDatasetIsErrorFree,
  AnsweredIfTheDatasetIsReadyToBeShared,
  AnsweredIfTheDatasetIsMissingAnything,
  PublicationOfDatasetReviewWasRequested,
  ZenodoRecordForDatasetReviewWasCreated,
  DatasetReviewWasAssignedADoi,
  DatasetReviewWasPublished,
  ZenodoRecordForDatasetReviewWasPublished,
  DatasetReviewDoiWasActivated,
)

export const DatasetReviewEventTypes = Array.map(DatasetReviewEvent.members, Struct.get('_tag'))
