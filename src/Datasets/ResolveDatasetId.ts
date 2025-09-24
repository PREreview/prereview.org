import { Effect, Struct } from 'effect'
import type { Datacite } from '../ExternalApis/index.ts'
import { GetDatasetFromDatacite } from './Datacite/index.ts'
import type * as Dataset from './Dataset.ts'
import type * as DatasetId from './DatasetId.ts'

export const ResolveDatasetId = (
  id: DatasetId.DatasetId,
): Effect.Effect<
  DatasetId.DatasetId,
  Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable | Dataset.NotADataset,
  Datacite.Datacite
> => Effect.andThen(GetDatasetFromDatacite(id), Struct.get('id'))
