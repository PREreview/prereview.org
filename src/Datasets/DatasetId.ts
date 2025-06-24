import { Schema } from 'effect'
import { Doi } from '../types/index.js'

export type DatasetId = typeof DatasetId.Type

export class DryadDatasetId extends Schema.TaggedClass<DryadDatasetId>()('DryadDatasetId', {
  value: Doi.RegistrantDoiSchema('5061'),
}) {}

export const DatasetId = Schema.Union(DryadDatasetId)
