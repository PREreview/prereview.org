import type { Types } from 'effect'
import { EventSubscription as GenericEventSubscription } from '../../EventSourcing/index.ts'
import { EventStore } from './EventStore.ts'
import type { Event } from './Events.ts'

export type Handlers = GenericEventSubscription.Handlers<Event>

export const subscribe = <H extends Types.NoExcessProperties<Handlers, H>>(name: string, handlers: H) =>
  GenericEventSubscription.subscribe(EventStore, name, handlers)

export const make = <H extends Types.NoExcessProperties<Handlers, H>>(name: string, handlers: H) =>
  GenericEventSubscription.make(EventStore, name, handlers)
