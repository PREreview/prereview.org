import { Array, Boolean, Equal, Option } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewEvent } from '../Events.js'

export const FindInProgressReviewForADataset =
  (events: ReadonlyArray<{ readonly event: DatasetReviewEvent; readonly resourceId: Uuid.Uuid }>) =>
  (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId): Option.Option<Uuid.Uuid> => {
    return Array.findFirst(events, ({ event, resourceId }) =>
      Boolean.match(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        event._tag === 'DatasetReviewWasStarted' &&
          Equal.equals(authorId, event.authorId) &&
          Equal.equals(datasetId, event.datasetId),
        {
          onFalse: Option.none,
          onTrue: () => Option.some(resourceId),
        },
      ),
    )
  }
