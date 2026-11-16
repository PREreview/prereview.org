import { Array, flow, HashMap, Option, Order, Result, Schema, Tuple } from 'effect'
import * as Events from '../../../Events.ts'
import * as Queries from '../../../Queries.ts'
import { Temporal } from '../../../types/index.ts'
import * as Preprints from '../../Preprints/index.ts'

export type Input = typeof Input.Type

const Input = Preprints.IndeterminatePreprintIdFromStringSchema

export type Result = ReadonlyArray<number>

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({ types: ['PreprintReviewImported'] })

type State = HashMap.HashMap<string, HashMap.HashMap<number, Temporal.Instant>>

const toKey = Schema.encodeSync(Preprints.IndeterminatePreprintIdFromStringSchema)

const toInstant = (published: PertinentEvent['published']): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  HashMap.set(
    state,
    toKey(event.preprint),
    HashMap.set(
      Option.getOrElse(HashMap.get(state, toKey(event.preprint)), () => HashMap.empty<number, Temporal.Instant>()),
      event.id,
      toInstant(event.published),
    ),
  )

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateStateWithPertinentEvent(currentState, event)
    }),
  )

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, input: Input): Result =>
    Option.match(HashMap.get(state, toKey(input)), {
      onNone: Array.empty,
      onSome: reviews =>
        Array.filter(
          Array.map(
            Array.sortWith(Array.fromIterable(reviews), Tuple.get(1), Order.flip(Temporal.OrderInstant)),
            Tuple.get(0),
          ),
          id => !wasPrereviewRemoved(id),
        ),
    })

export const ListPreprintReviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'PreprintReviews.getPublishedPreprintReviewsForAPreprint.ListPreprintReviewIds',
    inputSchema: Input,
    initialState: HashMap.empty<string, HashMap.HashMap<number, Temporal.Instant>>(),
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
