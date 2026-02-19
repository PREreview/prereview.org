import { Array, Either, flow, Match, Option, Record, Struct } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import type { TopicId } from '../../types/Topic.ts'

export interface RecentReviewRequest {
  readonly id: Uuid.Uuid
  readonly published: Temporal.Instant
  readonly topics: ReadonlyArray<TopicId>
  readonly preprintId: Preprints.IndeterminatePreprintId
}

export type Result = ReadonlyArray<RecentReviewRequest>

const eventTypes = [
  'ReviewRequestForAPreprintWasReceived',
  'ReviewRequestForAPreprintWasAccepted',
  'ReviewRequestByAPrereviewerWasImported',
  'ReviewRequestFromAPreprintServerWasImported',
  'ReviewRequestForAPreprintWasCategorized',
  'ReviewRequestForAPreprintWasRecategorized',
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

type State = Record<
  Uuid.Uuid,
  {
    published: Temporal.Instant | undefined
    topics: ReadonlyArray<TopicId>
    preprintId: Preprints.IndeterminatePreprintId
  }
>

const initialState: State = Record.empty()

const updateStateWithEvent = (state: State, event: Events.Event): State => {
  if (!Events.matches(event, filter)) {
    return state
  }

  return updateStateWithPertinentEvent(state, event)
}

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasReceived: event =>
      Record.set(state, event.reviewRequestId, {
        published: undefined,
        topics: [],
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasAccepted: event =>
      Record.modify(state, event.reviewRequestId, review => ({
        ...review,
        published: event.acceptedAt,
      })),
    ReviewRequestByAPrereviewerWasImported: event =>
      Record.set(state, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        preprintId: event.preprintId,
      }),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Record.set(state, event.reviewRequestId, {
        published: event.publishedAt,
        topics: [],
        preprintId: event.preprintId,
      }),
    ReviewRequestForAPreprintWasCategorized: event =>
      Record.modify(state, event.reviewRequestId, review => ({
        ...review,
        topics: event.topics,
      })),
    ReviewRequestForAPreprintWasRecategorized: event =>
      Record.modify(state, event.reviewRequestId, review => ({
        ...review,
        topics: event.topics ?? review.topics,
      })),
  })

const query = (reviewRequests: State): Result => {
  const filteredReviewRequests = Record.filterMap(reviewRequests, reviewRequest =>
    reviewRequest.published !== undefined
      ? Option.some({
          published: reviewRequest.published,
          topics: reviewRequest.topics,
          preprintId: reviewRequest.preprintId,
        })
      : Option.none(),
  )

  const sortedReviewRequests = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
      Struct.get('published'),
      Temporal.OrderInstant,
    ),
  )

  return Array.take(sortedReviewRequests, 5)
}

export const GetFiveMostRecentReviewRequests = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getFiveMostRecentReviewRequests',
  initialState,
  updateStateWithEvent,
  query: flow(query, Either.right),
})
