import { Array, flow, HashMap, Order, pipe, Result, Tuple } from 'effect'
import * as Events from '../../../Events.ts'
import * as Queries from '../../../Queries.ts'
import { Temporal } from '../../../types/index.ts'

export type Result = ReadonlyArray<number>

const filter = Events.EventFilter({ types: ['PreprintReviewImported'] })

type State = HashMap.HashMap<number, Temporal.Instant>

const initialState: State = HashMap.empty()

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return HashMap.set(currentState, event.id, toInstant(event.published))
  })

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State): Result =>
    pipe(
      Array.fromIterable(state),
      Array.filter(([id]) => !wasPrereviewRemoved(id)),
      Array.sortWith(Tuple.get(1), Order.flip(Temporal.OrderInstant)),
      Array.map(Tuple.get(0)),
    )

export const ListAllPreprintReviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'PreprintReviews.getAllPublishedPreprintReviews.ListAllPreprintReviewIds',
    initialState,
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
