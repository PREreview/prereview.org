import { Option } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewEvent } from '../Events.js'

export const FindInProgressReviewForADataset =
  (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    events: ReadonlyArray<{ readonly event: DatasetReviewEvent; readonly resourceId: Uuid.Uuid }>,
  ) =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId): Option.Option<Uuid.Uuid> => {
    return Option.none()
  }
