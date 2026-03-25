import { Effect, pipe } from 'effect'
import * as Datasets from '../../../Datasets/index.ts'
import { Datacite } from '../../../ExternalApis/index.ts'
import type { DataciteDatasetId } from './DatasetId.ts'
import { RecordToDataset } from './RecordToDataset.ts'

export { IsDataciteDatasetId } from './DatasetId.ts'

export const GetDatasetFromDatacite = (
  id: DataciteDatasetId,
): Effect.Effect<
  Datasets.Dataset,
  Datasets.NotADataset | Datasets.DatasetIsNotFound | Datasets.DatasetIsUnavailable,
  Datacite.Datacite
> =>
  pipe(
    Datacite.getRecord(id.value),
    Effect.andThen(RecordToDataset),
    Effect.catchTags({
      RecordIsNotFound: error => new Datasets.DatasetIsNotFound({ cause: error, datasetId: id }),
      RecordIsNotSupported: error => new Datasets.NotADataset({ cause: error, datasetId: id }),
      RecordIsUnavailable: error => new Datasets.DatasetIsUnavailable({ cause: error, datasetId: id }),
    }),
  )
