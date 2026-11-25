import { Array, Context, Layer, Schema } from 'effect'
import * as EventFilters from '../../src/EventSourcing/EventFilter.ts'
import type * as GenericEventStore from '../../src/EventSourcing/EventStore.ts'
import * as SensitiveData from '../../src/EventSourcing/SensitiveData.ts'
import * as SqlEventStore from '../../src/EventSourcing/SqlEventStore.ts'
import type * as GenericStatefulQueries from '../../src/EventSourcing/StatefulQueries.ts'
import * as fc from '../fc.ts'

export class ThingStarted extends Schema.TaggedClass<ThingStarted>()('ThingStarted', {
  thingId: Schema.String,
}) {}

export class ThingFinished extends Schema.TaggedClass<ThingFinished>()('ThingFinished', {
  thingId: Schema.String,
}) {}

const Rating = Schema.Literals(['good', 'bad'])

export class ThingRated extends Schema.TaggedClass<ThingRated>()('ThingRated', {
  thingId: Schema.String,
  rating: Rating,
}) {}

export class ThingReviewed extends Schema.TaggedClass<ThingReviewed>()('ThingReviewed', {
  thingId: Schema.String,
  rating: Rating,
}) {}

export class ThingMoved extends Schema.TaggedClass<ThingMoved>()('ThingMoved', {
  thingId: Schema.String,
  location: Schema.fromJsonString(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
}) {}

export class ThingWeighed extends Schema.TaggedClass<ThingWeighed>()('ThingWeighed', {
  thingId: Schema.String,
  weight: Schema.Number,
}) {}

export class ThingNamed extends Schema.TaggedClass<ThingNamed>()('ThingNamed', {
  thingId: Schema.String,
  name: SensitiveData.SensitiveData(Schema.String),
}) {}

export const Event = Schema.Union([ThingStarted, ThingFinished, ThingRated, ThingReviewed, ThingMoved, ThingWeighed])

export type Event = typeof Event.Type

export const EventTypes = Array.map(Event.members, member => member.identifier as Event['_tag'])

export const EventFilter = EventFilters.make(Event)

export const EventStore = Context.Service<GenericEventStore.EventStore<Event>>('EventStore')

export const StatefulQueries = Context.Service<GenericStatefulQueries.StatefulQueries<Event>>('StatefulQueries')

export const sqlEventStoreLayer = Layer.effect(EventStore, SqlEventStore.make(Event))

export const append = (event: Event) => EventStore.use(store => store.append(event))

export const latestCursor = EventStore.use(store => store.latestCursor)

export const thingStarted = (): fc.Arbitrary<ThingStarted> => fc.uuid().map(thingId => new ThingStarted({ thingId }))

export const thingFinished = (): fc.Arbitrary<ThingFinished> => fc.uuid().map(thingId => new ThingFinished({ thingId }))

export const thingRated = (): fc.Arbitrary<ThingRated> =>
  fc.record({ thingId: fc.uuid(), rating: fc.constantFrom('good', 'bad') }).map(fields => new ThingRated(fields))

export const thingReviewed = (): fc.Arbitrary<ThingReviewed> =>
  fc.record({ thingId: fc.uuid(), rating: fc.constantFrom('good', 'bad') }).map(fields => new ThingReviewed(fields))

export const thingMoved = (): fc.Arbitrary<ThingMoved> =>
  fc
    .record({ thingId: fc.uuid(), location: fc.record({ x: fc.integer(), y: fc.integer() }) })
    .map(fields => new ThingMoved(fields))

export const thingWeighed = (): fc.Arbitrary<ThingWeighed> =>
  fc.record({ thingId: fc.uuid(), weight: fc.integer() }).map(fields => new ThingWeighed(fields))

export const event = (): fc.Arbitrary<Event> =>
  fc.oneof(thingStarted(), thingFinished(), thingRated(), thingReviewed(), thingMoved(), thingWeighed())
