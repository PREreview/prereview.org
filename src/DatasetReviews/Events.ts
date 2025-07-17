import { Context, Schema } from 'effect'
import * as Datasets from '../Datasets/index.js'
import type { EventStore } from '../EventStore.js'
import { Doi, Orcid } from '../types/index.js'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewsEventStore extends Context.Tag('DatasetReviewsEventStore')<
  DatasetReviewsEventStore,
  EventStore<DatasetReviewEvent>
>() {}

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: Orcid.OrcidSchema,
  datasetId: Datasets.DatasetId,
}) {}

export class AnsweredIfTheDatasetFollowsFairAndCarePrinciples extends Schema.TaggedClass<AnsweredIfTheDatasetFollowsFairAndCarePrinciples>()(
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  { answer: Schema.Literal('yes', 'partly', 'no', 'unsure') },
) {}

export class PublicationOfDatasetReviewWasRequested extends Schema.TaggedClass<PublicationOfDatasetReviewWasRequested>()(
  'PublicationOfDatasetReviewWasRequested',
  {},
) {}

export class DatasetReviewWasAssignedADoi extends Schema.TaggedClass<DatasetReviewWasAssignedADoi>()(
  'DatasetReviewWasAssignedADoi',
  {
    id: Schema.Number,
    doi: Doi.DoiSchema,
  },
) {}

export class DatasetReviewWasPublished extends Schema.TaggedClass<DatasetReviewWasPublished>()(
  'DatasetReviewWasPublished',
  {},
) {}

export const DatasetReviewEvent = Schema.Union(
  DatasetReviewWasStarted,
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
  PublicationOfDatasetReviewWasRequested,
  DatasetReviewWasAssignedADoi,
  DatasetReviewWasPublished,
)
