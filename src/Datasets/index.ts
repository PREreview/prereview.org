import { Context, Effect } from 'effect'
import type * as Dataset from './Dataset.ts'
import type * as DatasetId from './DatasetId.ts'

export * from './Dataset.ts'
export * from './DatasetId.ts'
export * from './DatasetRepositories.ts'

export class Datasets extends Context.Tag('Datasets')<
  Datasets,
  {
    getDataset: (
      id: DatasetId.DatasetId,
    ) => Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable>
    getDatasetTitle: (
      id: DatasetId.DatasetId,
    ) => Effect.Effect<Dataset.DatasetTitle, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable>
    resolveDatasetId: (
      id: DatasetId.DatasetId,
    ) => Effect.Effect<
      DatasetId.DatasetId,
      Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable | Dataset.NotADataset
    >
  }
>() {}

export const { getDataset, getDatasetTitle, resolveDatasetId } = Effect.serviceFunctions(Datasets)
