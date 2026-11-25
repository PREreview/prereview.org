// oxlint-disable module-boundaries/use-index
import { Context } from 'effect'
import * as GenericStatefulQueries from '../../EventSourcing/StatefulQueries.ts'
import { EventStore } from './EventStore.ts'
import type { Event } from './Events.ts'

export { RegisteredAfterReplay } from '../../EventSourcing/StatefulQueries.ts'

export type Subscriber = GenericStatefulQueries.Subscriber<Event>

export type StatefulQueries = GenericStatefulQueries.StatefulQueries<Event>

export const StatefulQueries = Context.Service<StatefulQueries>('StatefulQueries')

export const { layer, worker, replay } = GenericStatefulQueries.make(StatefulQueries, EventStore)
