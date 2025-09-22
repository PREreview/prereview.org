import { Effect, Equal } from 'effect'
import { Doi } from '../types/index.js'
import * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export const ResolveDatasetId = (
  id: DatasetId.DatasetId,
): Effect.Effect<DatasetId.DatasetId, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable | Dataset.NotADataset> =>
  Effect.if(Equal.equals(id.value, Doi.Doi('10.5061/dryad.wstqjq2n3')), {
    onFalse: () => new Dataset.DatasetIsUnavailable({ cause: 'not implemented', datasetId: id }),
    onTrue: () => Effect.succeed(id),
  })
