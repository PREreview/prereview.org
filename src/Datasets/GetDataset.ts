import { Effect } from 'effect'
import type { Datacite } from '../ExternalApis/index.js'
import { GetDatasetFromDatacite } from './Datacite/index.js'
import * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export const GetDataset = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable, Datacite.Datacite> =>
  Effect.catchTag(
    GetDatasetFromDatacite(id),
    'NotADataset',
    error => new Dataset.DatasetIsNotFound({ cause: error, datasetId: id }),
  )
