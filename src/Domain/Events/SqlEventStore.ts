// oxlint-disable module-boundaries/use-index
import { Layer } from 'effect'
import * as GenericSqlEventStore from '../../EventSourcing/SqlEventStore.ts'
import { EventStore } from './EventStore.ts'
import { Event } from './Events.ts'

export const layer = Layer.effect(EventStore, GenericSqlEventStore.make(Event))
