import { Array, Schema, Struct } from 'effect'
import * as Datasets from '../Datasets/index.js'
import { Doi, Orcid, Temporal, Uuid } from '../types/index.js'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: Orcid.OrcidSchema,
  datasetId: Datasets.DatasetIdFromString,
  datasetReviewId: Uuid.UuidSchema,
}) {}

export class AnsweredIfTheDatasetFollowsFairAndCarePrinciples extends Schema.TaggedClass<AnsweredIfTheDatasetFollowsFairAndCarePrinciples>()(
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure'), datasetReviewId: Uuid.UuidSchema },
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
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
  PublicationOfDatasetReviewWasRequested,
  ZenodoRecordForDatasetReviewWasCreated,
  DatasetReviewWasAssignedADoi,
  DatasetReviewWasPublished,
  ZenodoRecordForDatasetReviewWasPublished,
  DatasetReviewDoiWasActivated,
)

export const DatasetReviewEventTypes = Array.map(DatasetReviewEvent.members, Struct.get('_tag'))
