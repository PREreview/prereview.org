import { Array, Data, flow, HashMap, Match, Order, pipe, Result, Schema, Struct } from 'effect'
import { Queries } from '../../../EventSourcing/index.ts'
import { Temporal, type Uuid } from '../../../types/index.ts'
import * as Events from '../../Events/index.ts'

export type Input = typeof Input.Type

const Input = Schema.Int

export type RecentPrereviewId = Data.TaggedEnum<{
  PreprintReview: { readonly id: number }
  DatasetReview: { readonly id: Uuid.Uuid }
}>

export const RecentPrereviewId = Data.taggedEnum<RecentPrereviewId>()

export type Result = ReadonlyArray<RecentPrereviewId>

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({ types: ['PreprintReviewImported', 'DatasetReviewWasPublished'] })

interface State {
  readonly preprintReviews: HashMap.HashMap<number, Temporal.Instant>
  readonly datasetReviews: HashMap.HashMap<Uuid.Uuid, Temporal.Instant>
}

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    PreprintReviewImported: event => ({
      ...state,
      preprintReviews: HashMap.set(state.preprintReviews, event.id, toInstant(event.published)),
    }),
    DatasetReviewWasPublished: event => ({
      ...state,
      datasetReviews: HashMap.set(state.datasetReviews, event.datasetReviewId, toInstant(event.publicationDate)),
    }),
  })

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return updateStateWithPertinentEvent(currentState, event)
  })

interface Entry {
  readonly prereview: RecentPrereviewId
  readonly published: Temporal.Instant
}

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, limit: Input): Result => {
    const preprintReviews = pipe(
      Array.fromIterable(state.preprintReviews),
      Array.filter(([id]) => !wasPrereviewRemoved(id)),
      Array.map(([id, published]): Entry => ({ prereview: RecentPrereviewId.PreprintReview({ id }), published })),
    )

    const datasetReviews = Array.map(Array.fromIterable(state.datasetReviews), ([id, published]): Entry => ({
      prereview: RecentPrereviewId.DatasetReview({ id }),
      published,
    }))

    return pipe(
      Array.appendAll(preprintReviews, datasetReviews),
      Array.sortWith(Struct.get('published'), Order.flip(Temporal.OrderInstant)),
      Array.take(limit),
      Array.map(Struct.get('prereview')),
    )
  }

export const ListRecentPrereviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'Prereviews.getFiveMostRecentPrereviews.ListRecentPrereviewIds',
    inputSchema: Input,
    initialState: { preprintReviews: HashMap.empty(), datasetReviews: HashMap.empty() } satisfies State,
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
