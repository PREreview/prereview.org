import { Context, Effect, Layer, Match, pipe, Scope, Struct } from 'effect'
import * as Datasets from '../../Datasets/index.ts'
import type { Datacite } from '../../ExternalApis/index.ts'
import { GetDatasetFromDatacite, IsDataciteDatasetId } from './Datacite/index.ts'

export const layer = Layer.effect(
  Datasets.Datasets,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<Datacite.Datacite>(), Context.omit(Scope.Scope))

    const GetDatasetFromSource = pipe(
      Match.type<Datasets.DatasetId>(),
      Match.tag('ScieloDatasetId', id =>
        Effect.fail(new Datasets.DatasetIsUnavailable({ cause: 'not implemented', datasetId: id })),
      ),
      Match.when(IsDataciteDatasetId, GetDatasetFromDatacite),
      Match.exhaustive,
    )

    return {
      getDataset: id =>
        pipe(
          GetDatasetFromSource(id),
          Effect.catchTag('NotADataset', error => new Datasets.DatasetIsNotFound({ cause: error, datasetId: id })),
          Effect.tapErrorTag('DatasetIsUnavailable', error =>
            Effect.annotateLogs(Effect.logError('Unable to get dataset'), { error }),
          ),
          Effect.provide(context),
          Effect.withSpan('Datasets.getDataset', { attributes: { id } }),
        ),
      getDatasetTitle: id =>
        pipe(
          GetDatasetFromSource(id),
          Effect.map(Datasets.DatasetTitle.fromDataset),
          Effect.catchTag('NotADataset', error => new Datasets.DatasetIsNotFound({ cause: error, datasetId: id })),
          Effect.tapErrorTag('DatasetIsUnavailable', error =>
            Effect.annotateLogs(Effect.logError('Unable to get dataset title'), { error }),
          ),
          Effect.provide(context),
          Effect.withSpan('Datasets.getDatasetTitle', { attributes: { id } }),
        ),
      resolveDatasetId: (id: Datasets.DatasetId) =>
        pipe(
          GetDatasetFromSource(id),
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
