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
  types: [
    'ReviewRequestForAPreprintWasReceived',
    'ReviewRequestForAPreprintWasAccepted',
    'ReviewRequestForAPreprintWasCategorized',
  ],
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
        received: boolean
      }
    >(),
    (map, event) =>
      Match.valueTags(event, {
        ReviewRequestForAPreprintWasReceived: event =>
          Option.getOrElse(
            Record.modifyOption(map, event.reviewRequestId, review => ({
              ...review,
              received: true,
            })),
            () =>
              Record.set(map, event.reviewRequestId, {
                published: undefined,
                topics: [],
                preprintId: undefined,
                received: true,
              }),
          ),
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
                received: false,
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
                received: false,
              }),
          ),
      }),
  )

  const filteredReviewRequests = Record.filter(reviewRequests, reviewRequest =>
    Boolean.every([
      reviewRequest.published !== undefined,
      reviewRequest.preprintId !== undefined,
      reviewRequest.received,
    ]),
  ) as Record<
    Uuid.Uuid,
    {
      published: Temporal.Instant
      topics: ReadonlyArray<TopicId>
      preprintId: Preprints.IndeterminatePreprintId
      received: true
    }
  >

  const sortedReviewRequests = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
      Struct.get('published'),
      Temporal.OrderInstant,
    ),
  )

  return Array.take(Array.map(sortedReviewRequests, Struct.omit('received')), 5)
}
