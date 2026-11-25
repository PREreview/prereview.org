import { Layer } from 'effect'
import { SqlEventStore as GenericSqlEventStore } from '../../EventSourcing/index.ts'
import { EventStore } from './EventStore.ts'
import { Event } from './Events.ts'

export const layer = Layer.effect(EventStore, GenericSqlEventStore.make(Event))
