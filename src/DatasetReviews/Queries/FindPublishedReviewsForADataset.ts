import { Array } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Uuid } from '../../types/index.js'
import type * as Events from '../Events.js'

export const FindPublishedReviewsForADataset =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (events: ReadonlyArray<Events.DatasetReviewWasStarted | Events.DatasetReviewWasPublished>) =>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (datasetId: Datasets.DatasetId): ReadonlyArray<Uuid.Uuid> =>
      Array.empty()
