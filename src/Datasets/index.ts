import { Context, Effect, Layer } from 'effect'
import * as Dataset from './Dataset.js'
import type { GetDatasetTitle } from './GetDatasetTitle.js'

export * from './Dataset.js'
export * from './DatasetId.js'

export class Datasets extends Context.Tag('Datasets')<
  Datasets,
  {
    getDatasetTitle: (
      ...args: Parameters<typeof GetDatasetTitle>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetDatasetTitle>>,
      Effect.Effect.Error<ReturnType<typeof GetDatasetTitle>>
    >
  }
>() {}

export const { getDatasetTitle } = Effect.serviceFunctions(Datasets)

export const layer = Layer.succeed(Datasets, {
  getDatasetTitle: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented' }),
})
