import { Effect } from 'effect'
import type { Datacite } from '../ExternalApis/index.ts'
import * as Dataset from './Dataset.ts'
import type * as DatasetId from './DatasetId.ts'
import { GetDataset } from './GetDataset.ts'

export const GetDatasetTitle = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.DatasetTitle, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable, Datacite.Datacite> =>
  Effect.andThen(
    GetDataset(id),
    dataset =>
      new Dataset.DatasetTitle({ id: dataset.id, language: dataset.title.language, title: dataset.title.text }),
  )
