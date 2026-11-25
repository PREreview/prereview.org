import { Context, Layer, Schema } from 'effect'
import * as EventFilters from '../../src/EventSourcing/EventFilter.ts'
import type * as GenericEventStore from '../../src/EventSourcing/EventStore.ts'
import * as SqlEventStore from '../../src/EventSourcing/SqlEventStore.ts'
import type * as GenericStatefulQueries from '../../src/EventSourcing/StatefulQueries.ts'
import * as fc from '../fc.ts'

export class ThingStarted extends Schema.TaggedClass<ThingStarted>()('ThingStarted', {
  thingId: Schema.String,
}) {}

export class ThingFinished extends Schema.TaggedClass<ThingFinished>()('ThingFinished', {
  thingId: Schema.String,
}) {}

export const Event = Schema.Union([ThingStarted, ThingFinished])

export type Event = typeof Event.Type

export const EventFilter = EventFilters.make<Event>()

export const EventStore = Context.Service<GenericEventStore.EventStore<Event>>('EventStore')

export const StatefulQueries = Context.Service<GenericStatefulQueries.StatefulQueries<Event>>('StatefulQueries')

export const sqlEventStoreLayer = Layer.effect(EventStore, SqlEventStore.make(Event))

export const append = (event: Event) => EventStore.use(store => store.append(event))

export const latestCursor = EventStore.use(store => store.latestCursor)

export const thingStarted = (): fc.Arbitrary<ThingStarted> => fc.uuid().map(thingId => new ThingStarted({ thingId }))

export const thingFinished = (): fc.Arbitrary<ThingFinished> => fc.uuid().map(thingId => new ThingFinished({ thingId }))

export const event = (): fc.Arbitrary<Event> => fc.oneof(thingStarted(), thingFinished())
