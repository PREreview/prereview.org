import { Context, Effect, Layer } from 'effect'
import * as Dataset from './Dataset.js'
import type { GetDataset } from './GetDataset.js'
import type { GetDatasetTitle } from './GetDatasetTitle.js'

export * from './Dataset.js'
export * from './DatasetId.js'

export class Datasets extends Context.Tag('Datasets')<
  Datasets,
  {
    getDataset: (
      ...args: Parameters<typeof GetDataset>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetDataset>>,
      Effect.Effect.Error<ReturnType<typeof GetDataset>>
    >
    getDatasetTitle: (
      ...args: Parameters<typeof GetDatasetTitle>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetDatasetTitle>>,
      Effect.Effect.Error<ReturnType<typeof GetDatasetTitle>>
    >
  }
>() {}

export const { getDataset, getDatasetTitle } = Effect.serviceFunctions(Datasets)

export const layer = Layer.succeed(Datasets, {
  getDataset: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented' }),
  getDatasetTitle: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented' }),
})
