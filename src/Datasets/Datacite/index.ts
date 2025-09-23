import { Effect, pipe } from 'effect'
import { Datacite } from '../../ExternalApis/index.js'
import * as Dataset from '../Dataset.js'
import type * as DatasetId from '../DatasetId.js'
import { RecordToDataset } from './RecordToDataset.js'

export const GetDatasetFromDatacite = (
  id: DatasetId.DatasetId,
): Effect.Effect<
  Dataset.Dataset,
  Dataset.NotADataset | Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable,
  Datacite.Datacite
> =>
  pipe(
    Datacite.getRecord(id.value),
    Effect.andThen(RecordToDataset),
    Effect.catchTags({
      RecordIsNotFound: error => new Dataset.DatasetIsNotFound({ cause: error, datasetId: id }),
      RecordIsNotSupported: error => new Dataset.NotADataset({ cause: error, datasetId: id }),
      RecordIsUnavailable: error => new Dataset.DatasetIsUnavailable({ cause: error, datasetId: id }),
    }),
  )
