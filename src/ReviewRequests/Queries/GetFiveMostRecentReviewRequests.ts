import { Array, Boolean, Match, Option, Record, Struct } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import type { TopicId } from '../../types/Topic.ts'

export interface RecentReviewRequest {
  readonly id: Uuid.Uuid
  readonly published: Temporal.Instant
  readonly topics: ReadonlyArray<TopicId>
  readonly preprintId: Preprints.IndeterminatePreprintId
}

export type Result = ReadonlyArray<RecentReviewRequest>

export const filter = Events.EventFilter({
  types: ['ReviewRequestForAPreprintWasAccepted', 'ReviewRequestForAPreprintWasCategorized'],
})

export const query = (events: ReadonlyArray<Events.ReviewRequestEvent>): Result => {
  const filteredEvents = Array.filter(events, Events.matches(filter))

  const reviewRequests = Array.reduce(
    filteredEvents,
    Record.empty<
      Uuid.Uuid,
      {
        published: Temporal.Instant | undefined
        topics: ReadonlyArray<TopicId>
        preprintId: Preprints.IndeterminatePreprintId | undefined
      }
    >(),
    (map, event) =>
      Match.valueTags(event, {
        ReviewRequestForAPreprintWasAccepted: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              published: event.acceptedAt,
              preprintId: event.preprintId,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: event.acceptedAt,
                topics: [],
                preprintId: event.preprintId,
              }),
          ),
        ReviewRequestForAPreprintWasCategorized: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              topics: event.topics,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: undefined,
                topics: event.topics,
                preprintId: undefined,
              }),
          ),
      }),
  )

  const filteredReviewRequests = Record.filter(reviewRequests, reviewRequest =>
    Boolean.every([reviewRequest.published !== undefined, reviewRequest.preprintId !== undefined]),
  ) as Record<
    Uuid.Uuid,
    {
      published: Temporal.Instant
      topics: ReadonlyArray<TopicId>
      preprintId: Preprints.IndeterminatePreprintId
    }
  >

  const sortedReviewRequests = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
      Struct.get('published'),
      Temporal.OrderInstant,
    ),
  )

  return Array.take(sortedReviewRequests, 5)
}
