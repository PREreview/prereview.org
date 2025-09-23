import { Effect, Struct } from 'effect'
import type { Datacite } from '../ExternalApis/index.js'
import { GetDatasetFromDatacite } from './Datacite/index.js'
import type * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'

export const ResolveDatasetId = (
  id: DatasetId.DatasetId,
): Effect.Effect<
  DatasetId.DatasetId,
  Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable | Dataset.NotADataset,
  Datacite.Datacite
> => Effect.andThen(GetDatasetFromDatacite(id), Struct.get('id'))
