import { Array, Either, flow, HashMap, Struct, type Order } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import { Temporal, type OrcidId } from '../types/index.ts'

export interface PrereviewerForStats {
  orcidId: OrcidId.OrcidId
  registeredAt: Temporal.Instant | 'not available from import source'
}

export type Result = ReadonlyArray<PrereviewerForStats>

type State = HashMap.HashMap<OrcidId.OrcidId, PrereviewerForStats>

const filter = Events.EventFilter({ types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered'] })

const updateStateWithPertinentEvent = (
  state: State,
  event: Events.RegisteredPrereviewerImported | Events.PrereviewerRegistered,
): State =>
  HashMap.set(state, event.orcidId, {
    orcidId: event.orcidId,
    registeredAt: event.registeredAt,
  })

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return updateStateWithPertinentEvent(currentState, event)
    }),
  )

const OrderRegisteredAt: Order.Order<PrereviewerForStats['registeredAt']> = (self, that) => {
  if (self === that) {
    return 0
  }

  if (self === 'not available from import source') {
    return -1
  }

  if (that === 'not available from import source') {
    return 1
  }

  return Temporal.OrderInstant(self, that)
}

const query: (state: State) => Result = flow(
  HashMap.toValues,
  Array.sortWith(Struct.get('registeredAt'), OrderRegisteredAt),
)

export const ListAllPrereviewersForStats: Queries.StatefulQuery<State, [], Result, never> = Queries.StatefulQuery({
  name: 'Prereviewers.listAllPrereviewersForStats',
  initialState: HashMap.empty(),
  updateStateWithEvents,
  query: flow(query, Either.right),
})
