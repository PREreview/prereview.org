import { Effect, pipe } from 'effect'
import type { Datacite } from '../ExternalApis/index.ts'
import { GetDatasetFromDatacite } from './Datacite/index.ts'
import * as Dataset from './Dataset.ts'
import type * as DatasetId from './DatasetId.ts'

export const GetDataset = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.Dataset, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable, Datacite.Datacite> =>
  pipe(
    GetDatasetFromDatacite(id),
    Effect.catchTag('NotADataset', error => new Dataset.DatasetIsNotFound({ cause: error, datasetId: id })),
    Effect.tapErrorTag('DatasetIsUnavailable', error =>
      Effect.annotateLogs(Effect.logError('Unable to get dataset'), { error }),
    ),
  )
