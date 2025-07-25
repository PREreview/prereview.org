import { Array, Context, Schema, Struct } from 'effect'
import * as Datasets from '../Datasets/index.js'
import type { EventStore } from '../EventStore.js'
import { Doi, Orcid, Uuid } from '../types/index.js'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewsEventStore extends Context.Tag('DatasetReviewsEventStore')<
  DatasetReviewsEventStore,
  EventStore
>() {}

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: Orcid.OrcidSchema,
  datasetId: Datasets.DatasetId,
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

export class DatasetReviewWasAssignedADoi extends Schema.TaggedClass<DatasetReviewWasAssignedADoi>()(
  'DatasetReviewWasAssignedADoi',
  {
    id: Schema.Number,
    doi: Doi.DoiSchema,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasPublished extends Schema.TaggedClass<DatasetReviewWasPublished>()(
  'DatasetReviewWasPublished',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export const DatasetReviewEvent = Schema.Union(
  DatasetReviewWasStarted,
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
  PublicationOfDatasetReviewWasRequested,
  DatasetReviewWasAssignedADoi,
  DatasetReviewWasPublished,
)

export const DatasetReviewEventTypes = Array.map(DatasetReviewEvent.members, Struct.get('_tag'))
