import { Array, Equal, Option, pipe, Predicate, Record, Tuple } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid, Uuid } from '../../types/index.js'
import type { DatasetReviewEvent } from '../Events.js'

export const FindInProgressReviewForADataset =
  (events: ReadonlyArray<{ readonly event: DatasetReviewEvent; readonly resourceId: Uuid.Uuid }>) =>
  (authorId: Orcid.Orcid, datasetId: Datasets.DatasetId): Option.Option<Uuid.Uuid> =>
    pipe(
      Array.reduce(
        events,
        Record.empty<Uuid.Uuid, ReadonlyArray<DatasetReviewEvent>>(),
        (candidates, { event, resourceId }) =>
          pipe(
            Record.modifyOption(candidates, resourceId, Array.append(event)),
            Option.getOrElse(() => {
              if (
                event._tag === 'DatasetReviewWasStarted' &&
                Equal.equals(event.authorId, authorId) &&
                Equal.equals(event.datasetId, datasetId)
              ) {
                return Record.set(candidates, resourceId, Array.of(event))
              }

              return candidates
            }),
          ),
      ),
      Record.findFirst(
        Array.every(
          Predicate.not(
            Predicate.some([
              Predicate.isTagged('PublicationWasRequested'),
              Predicate.isTagged('DatasetReviewWasPublished'),
            ]),
          ),
        ),
      ),
      Option.map(Tuple.getFirst),
    )
