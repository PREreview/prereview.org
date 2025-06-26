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

export class PublicationWasRequested extends Schema.TaggedClass<PublicationWasRequested>()(
  'PublicationWasRequested',
  {},
) {}

export class DoiWasAssigned extends Schema.TaggedClass<DoiWasAssigned>()('DoiWasAssigned', {
  id: Schema.Number,
  doi: Doi.DoiSchema,
}) {}

export class DatasetReviewWasPublished extends Schema.TaggedClass<DatasetReviewWasPublished>()(
  'DatasetReviewWasPublished',
  {},
) {}

export const DatasetReviewEvent = Schema.Union(
  DatasetReviewWasStarted,
  PublicationWasRequested,
  DoiWasAssigned,
  DatasetReviewWasPublished,
)
