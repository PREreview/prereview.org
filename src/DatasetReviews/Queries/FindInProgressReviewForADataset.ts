import { Array, Boolean, Equal, Match, Option, pipe, Record, Tuple } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type * as Events from '../Events.js'

export const FindInProgressReviewForADataset =
  (
    events: ReadonlyArray<
      Events.DatasetReviewWasStarted | Events.PublicationOfDatasetReviewWasRequested | Events.DatasetReviewWasPublished
    >,
  ) =>
  (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId): Option.Option<Uuid.Uuid> =>
    pipe(
      Array.reduce(events, Record.empty<Uuid.Uuid, boolean>(), (candidates, event) =>
        Match.valueTags(event, {
          DatasetReviewWasStarted: () => {
            if (
              event._tag === 'DatasetReviewWasStarted' &&
              Equal.equals(event.authorId, authorId) &&
              Equal.equals(event.datasetId, datasetId)
            ) {
              return Record.set(candidates, event.datasetReviewId, false)
            }

            return candidates
          },
          PublicationOfDatasetReviewWasRequested: () => Record.replace(candidates, event.datasetReviewId, true),
          DatasetReviewWasPublished: () => Record.replace(candidates, event.datasetReviewId, true),
        }),
      ),
      Record.findFirst(Boolean.not),
      Option.map(Tuple.getFirst),
    )
