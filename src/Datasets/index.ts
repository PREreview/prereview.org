import { Context, Effect, flow, Layer } from 'effect'
import type { Datacite } from '../ExternalApis/index.js'
import { GetDataset } from './GetDataset.js'
import { GetDatasetTitle } from './GetDatasetTitle.js'
import { ResolveDatasetId } from './ResolveDatasetId.js'

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
    resolveDatasetId: (
      ...args: Parameters<typeof ResolveDatasetId>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ResolveDatasetId>>,
      Effect.Effect.Error<ReturnType<typeof ResolveDatasetId>>
    >
  }
>() {}

export const { getDataset, getDatasetTitle, resolveDatasetId } = Effect.serviceFunctions(Datasets)

export const layer = Layer.effect(
  Datasets,
  Effect.gen(function* () {
    const context = yield* Effect.context<Datacite.Datacite>()

    return {
      getDataset: flow(GetDataset, Effect.provide(context)),
      getDatasetTitle: flow(GetDatasetTitle, Effect.provide(context)),
      resolveDatasetId: flow(ResolveDatasetId, Effect.provide(context)),
    }
  }),
)
