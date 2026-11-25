import { Context, Effect, Stream } from 'effect'
import { EventStore as GenericEventStore } from '../../EventSourcing/index.ts'
import type { Event, EventFilter } from './Events.ts'

export const Cursor = GenericEventStore.Cursor

export type Cursor = GenericEventStore.Cursor

export const Position = GenericEventStore.Position

export type Position = GenericEventStore.Position

export const FailedToGetEvents = GenericEventStore.FailedToGetEvents

export type FailedToGetEvents = GenericEventStore.FailedToGetEvents

export const FailedToCommitEvent = GenericEventStore.FailedToCommitEvent

export type FailedToCommitEvent = GenericEventStore.FailedToCommitEvent

export const NewEventsFound = GenericEventStore.NewEventsFound

export type NewEventsFound = GenericEventStore.NewEventsFound

export const FailedToLoadCheckpoint = GenericEventStore.FailedToLoadCheckpoint

export type FailedToLoadCheckpoint = GenericEventStore.FailedToLoadCheckpoint

export const FailedToSaveCheckpoint = GenericEventStore.FailedToSaveCheckpoint

export type FailedToSaveCheckpoint = GenericEventStore.FailedToSaveCheckpoint

export type RecordedEvent = GenericEventStore.RecordedEvent<Event>

export type Page = GenericEventStore.Page<Event>

export type EventStore = GenericEventStore.EventStore<Event>

export const EventStore = Context.Service<EventStore>('EventStore')

export const all = Stream.unwrap(EventStore.useSync(service => service.all))

export const since = (...args: Parameters<(typeof EventStore.Service)['since']>) =>
  Stream.unwrap(EventStore.useSync(service => service.since(...args)))

export const subscribe = (...args: Parameters<(typeof EventStore.Service)['subscribe']>) =>
  Stream.unwrap(EventStore.useSync(service => service.subscribe(...args)))

export const latestCursor = EventStore.use(service => service.latestCursor)

export const loadCheckpoint = (...args: Parameters<(typeof EventStore.Service)['loadCheckpoint']>) =>
  EventStore.use(service => service.loadCheckpoint(...args))

export const saveCheckpoint = (...args: Parameters<(typeof EventStore.Service)['saveCheckpoint']>) =>
  EventStore.use(service => service.saveCheckpoint(...args))

export const append = (...args: Parameters<(typeof EventStore.Service)['append']>) =>
  EventStore.use(service => service.append(...args))

export const appendIf = (...args: Parameters<(typeof EventStore.Service)['appendIf']>) =>
  EventStore.use(service => service.appendIf(...args))

export const query = Effect.fnUntraced(function* <Filter extends EventFilter>(filter: Filter) {
  const eventStore = yield* EventStore

  return yield* eventStore.query(filter)
})
