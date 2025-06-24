import { Schema } from 'effect'
import * as Datasets from '../Datasets/index.js'
import { Orcid } from '../types/index.js'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: Orcid.OrcidSchema,
  datasetId: Datasets.DatasetId,
}) {}

export const DatasetReviewEvent = Schema.Union(DatasetReviewWasStarted)
