import type { Effect } from 'effect'
import type * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export declare const GetDatasetTitle: (
  id: DatasetId.DatasetId,
) => Effect.Effect<Dataset.DatasetTitle, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable>
