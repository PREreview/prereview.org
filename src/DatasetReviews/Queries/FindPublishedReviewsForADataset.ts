import { Array, Equal, Order, pipe, Tuple, type Types } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import type { Uuid } from '../../types/index.ts'
import { OrderPlainDate } from '../../types/Temporal.ts'
import type * as Events from '../Events.ts'

export const FindPublishedReviewsForADataset =
  (events: ReadonlyArray<Events.DatasetReviewWasStarted | Events.DatasetReviewWasPublished>) =>
  (datasetId: Datasets.DatasetId): ReadonlyArray<Uuid.Uuid> =>
    pipe(
      Array.filter(events, hasTag('DatasetReviewWasPublished')),
      Array.filter(published =>
        Array.some(
          events,
          event =>
            event._tag === 'DatasetReviewWasStarted' &&
            Equal.equals(event.datasetReviewId, published.datasetReviewId) &&
            Equal.equals(event.datasetId, datasetId),
        ),
      ),
      Array.map(published => Tuple.make(published.datasetReviewId, published.publicationDate)),
      Array.sortWith(Tuple.getSecond, Order.reverse(OrderPlainDate)),
      Array.map(Tuple.getFirst),
    )

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
