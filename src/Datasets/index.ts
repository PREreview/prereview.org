import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Datacite } from '../ExternalApis/index.ts'
import { GetDataset } from './GetDataset.ts'
import { GetDatasetTitle } from './GetDatasetTitle.ts'
import { ResolveDatasetId } from './ResolveDatasetId.ts'

export * from './Dataset.ts'
export * from './DatasetId.ts'

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
    const context = yield* Effect.andThen(Effect.context<Datacite.Datacite>(), Context.omit(Scope.Scope))

    return {
      getDataset: flow(GetDataset, Effect.provide(context)),
      getDatasetTitle: flow(GetDatasetTitle, Effect.provide(context)),
      resolveDatasetId: flow(ResolveDatasetId, Effect.provide(context)),
    }
  }),
)
