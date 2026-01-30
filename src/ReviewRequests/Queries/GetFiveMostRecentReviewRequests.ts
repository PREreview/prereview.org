import { Array, Boolean, Either, flow, Match, Option, Record, Struct } from 'effect'
import * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import type { TopicId } from '../../types/Topic.ts'
import type { StatefulQuery } from './index.ts'

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
] as const

type PertinentEvent = Events.EventSubset<typeof eventTypes>

const filter = Events.EventFilter({ types: eventTypes })

type State = Record<
  Uuid.Uuid,
  {
    published: Temporal.Instant | undefined
    topics: ReadonlyArray<TopicId>
    preprintId: Preprints.IndeterminatePreprintId | undefined
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
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({
          ...review,
          preprintId: event.preprintId,
        })),
        () =>
          Record.set(state, event.reviewRequestId, {
            published: undefined,
            topics: [],
            preprintId: event.preprintId,
          }),
      ),
    ReviewRequestForAPreprintWasAccepted: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({
          ...review,
          published: event.acceptedAt,
        })),
        () =>
          Record.set(state, event.reviewRequestId, {
            published: event.acceptedAt,
            topics: [],
            preprintId: undefined,
          }),
      ),
    ReviewRequestByAPrereviewerWasImported: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({
          ...review,
          preprintId: event.preprintId,
          published: event.publishedAt,
        })),
        () =>
          Record.set(state, event.reviewRequestId, {
            published: event.publishedAt,
            topics: [],
            preprintId: event.preprintId,
          }),
      ),
    ReviewRequestFromAPreprintServerWasImported: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({
          ...review,
          preprintId: event.preprintId,
          published: event.publishedAt,
        })),
        () =>
          Record.set(state, event.reviewRequestId, {
            published: event.publishedAt,
            topics: [],
            preprintId: event.preprintId,
          }),
      ),
    ReviewRequestForAPreprintWasCategorized: event =>
      Option.getOrElse(
        Record.modifyOption(state, event.reviewRequestId, review => ({
          ...review,
          topics: event.topics,
        })),
        () =>
          Record.set(state, event.reviewRequestId, {
            published: undefined,
            topics: event.topics,
            preprintId: undefined,
          }),
      ),
  })

const query = (reviewRequests: State): Result => {
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

export const getFiveMostRecentReviewRequests: StatefulQuery<State, [], Result, never> = {
  name: 'getFiveMostRecentReviewRequests',
  initialState,
  updateStateWithEvent,
  query: flow(query, Either.right),
}
