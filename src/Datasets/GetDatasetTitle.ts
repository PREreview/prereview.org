import { Effect } from 'effect'
import * as Dataset from './Dataset.js'
import type * as DatasetId from './DatasetId.js'
import { GetDataset } from './GetDataset.js'

export const GetDatasetTitle = (
  id: DatasetId.DatasetId,
): Effect.Effect<Dataset.DatasetTitle, Dataset.DatasetIsNotFound | Dataset.DatasetIsUnavailable> =>
  Effect.andThen(
    GetDataset(id),
    dataset =>
      new Dataset.DatasetTitle({ id: dataset.id, language: dataset.title.language, title: dataset.title.text }),
  )
