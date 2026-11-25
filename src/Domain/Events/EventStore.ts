// oxlint-disable module-boundaries/use-index
import { Context, Effect, Stream } from 'effect'
import type * as GenericEventStore from '../../EventSourcing/EventStore.ts'
import type { Event, EventFilter } from './Events.ts'

export {
  Cursor,
  FailedToCommitEvent,
  FailedToGetEvents,
  FailedToLoadCheckpoint,
  FailedToSaveCheckpoint,
  NewEventsFound,
  Position,
} from '../../EventSourcing/EventStore.ts'

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
