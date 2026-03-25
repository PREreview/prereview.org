import { Context, Effect, Layer, pipe, Scope, Struct } from 'effect'
import * as Datasets from '../../Datasets/index.ts'
import type { Datacite } from '../../ExternalApis/index.ts'
import { GetDatasetFromDatacite } from './Datacite/index.ts'

export const layer = Layer.effect(
  Datasets.Datasets,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<Datacite.Datacite>(), Context.omit(Scope.Scope))

    return {
      getDataset: id =>
        pipe(
          GetDatasetFromDatacite(id),
          Effect.catchTag('NotADataset', error => new Datasets.DatasetIsNotFound({ cause: error, datasetId: id })),
          Effect.tapErrorTag('DatasetIsUnavailable', error =>
            Effect.annotateLogs(Effect.logError('Unable to get dataset'), { error }),
          ),
          Effect.provide(context),
          Effect.withSpan('Datasets.getDataset', { attributes: { id } }),
        ),
      getDatasetTitle: id =>
        pipe(
          GetDatasetFromDatacite(id),
          Effect.map(
            dataset =>
              new Datasets.DatasetTitle({
                id: dataset.id,
                language: dataset.title.language,
                title: dataset.title.text,
              }),
          ),
          Effect.catchTag('NotADataset', error => new Datasets.DatasetIsNotFound({ cause: error, datasetId: id })),
          Effect.provide(context),
          Effect.withSpan('Datasets.getDatasetTitle', { attributes: { id } }),
        ),
      resolveDatasetId: (id: Datasets.DatasetId) =>
        pipe(
          GetDatasetFromDatacite(id),
          Effect.andThen(Struct.get('id')),
          Effect.tapErrorTag('DatasetIsUnavailable', error =>
            Effect.annotateLogs(Effect.logError('Unable to resolve dataset ID'), { error }),
          ),
          Effect.provide(context),
          Effect.withSpan('Datasets.resolveDatasetId', { attributes: { id } }),
        ),
    }
  }),
)
