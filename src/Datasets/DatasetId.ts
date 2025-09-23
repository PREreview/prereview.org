import { Schema, Tuple } from 'effect'
import { Doi } from '../types/index.js'

export type DatasetId = typeof DatasetId.Type

export class DryadDatasetId extends Schema.TaggedClass<DryadDatasetId>()('DryadDatasetId', {
  value: Doi.RegistrantDoiSchema('5061'),
}) {}

export const DatasetId = Schema.Union(DryadDatasetId)

export const DatasetIdFromString = Schema.transform(
  Schema.TemplateLiteralParser('doi:', DryadDatasetId.fields.value),
  Schema.typeSchema(DatasetId),
  {
    strict: true,
    decode: ([, doi]) => new DryadDatasetId({ value: doi }),
    encode: datasetId => Tuple.make('doi:' as const, datasetId.value),
  },
)
