import { Effect } from 'effect'
import type { Datacite } from '../ExternalApis/index.ts'
import { GetDatasetFromDatacite } from './Datacite/index.ts'
import * as Dataset from './Dataset.ts'
import type * as DatasetId from './DatasetId.ts'

export const GetDataset = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable, Datacite.Datacite> =>
  Effect.catchTag(
    GetDatasetFromDatacite(id),
    'NotADataset',
    error => new Dataset.DatasetIsNotFound({ cause: error, datasetId: id }),
  )
