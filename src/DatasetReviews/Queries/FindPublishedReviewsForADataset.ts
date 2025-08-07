import { Array, Equal, Order, pipe, Tuple } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Uuid } from '../../types/index.js'
import { OrderPlainDate } from '../../types/Temporal.js'
import type * as Events from '../Events.js'

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

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
