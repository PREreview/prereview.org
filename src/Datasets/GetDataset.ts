import type { Effect } from 'effect'
import type * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export declare const GetDataset: (
  id: DatasetId.DatasetId,
) => Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable>
