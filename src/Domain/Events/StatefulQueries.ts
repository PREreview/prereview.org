import { Context } from 'effect'
import { StatefulQueries as GenericStatefulQueries } from '../../EventSourcing/index.ts'
import { EventStore } from './EventStore.ts'
import type { Event } from './Events.ts'

export const RegisteredAfterReplay = GenericStatefulQueries.RegisteredAfterReplay

export type RegisteredAfterReplay = GenericStatefulQueries.RegisteredAfterReplay

export type Subscriber = GenericStatefulQueries.Subscriber<Event>

export type StatefulQueries = GenericStatefulQueries.StatefulQueries<Event>

export const StatefulQueries = Context.Service<StatefulQueries>('StatefulQueries')

export const { layer, worker, replay } = GenericStatefulQueries.make(StatefulQueries, EventStore)
