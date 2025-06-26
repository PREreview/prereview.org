import { Array, Boolean, Equal, Match, Option, pipe, Record, Tuple } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewEvent } from '../Events.js'

export const FindInProgressReviewForADataset =
  (events: ReadonlyArray<{ readonly event: DatasetReviewEvent; readonly resourceId: Uuid.Uuid }>) =>
  (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId): Option.Option<Uuid.Uuid> =>
    pipe(
      Array.reduce(events, Record.empty<Uuid.Uuid, boolean>(), (candidates, { event, resourceId }) =>
        Match.valueTags(event, {
          DatasetReviewWasStarted: () => {
            if (
              event._tag === 'DatasetReviewWasStarted' &&
              Equal.equals(event.authorId, authorId) &&
              Equal.equals(event.datasetId, datasetId)
            ) {
              return Record.set(candidates, resourceId, false)
            }

            return candidates
          },
          PublicationWasRequested: () => Record.replace(candidates, resourceId, true),
          DoiWasAssigned: () => candidates,
          DatasetReviewWasPublished: () => Record.replace(candidates, resourceId, true),
        }),
      ),
      Record.findFirst(Boolean.not),
      Option.map(Tuple.getFirst),
    )
