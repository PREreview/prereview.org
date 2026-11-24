import { type Array, Context, Data, Effect, type Option, pipe, Schema, Stream } from 'effect'
import type { Event, EventFilter, EventsForFilter } from './Events.ts'

export const EventStore = Context.Service<EventStore>('EventStore')

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export class FailedToLoadCheckpoint extends Data.TaggedError('FailedToLoadCheckpoint')<{ cause?: Error }> {}

export class FailedToSaveCheckpoint extends Data.TaggedError('FailedToSaveCheckpoint')<{ cause?: Error }> {}

export const Position = pipe(Schema.Number, Schema.brand('Position'))

export type Position = typeof Position.Type

export const Cursor = pipe(Schema.String, Schema.brand('Cursor'))

export type Cursor = typeof Cursor.Type

export interface RecordedEvent {
  readonly event: Event
  readonly cursor: Cursor
}

export type Page = Array.NonEmptyReadonlyArray<RecordedEvent>

export interface EventStore {
  readonly all: Stream.Stream<Page, FailedToGetEvents>

  readonly since: (cursor: Cursor, filter?: EventFilter) => Stream.Stream<Page, FailedToGetEvents>

  readonly subscribe: (options?: {
    readonly after?: Cursor
    readonly filter?: EventFilter
  }) => Stream.Stream<Page, FailedToGetEvents>

  readonly latestCursor: Effect.Effect<Cursor, FailedToGetEvents>

  readonly loadCheckpoint: (name: string) => Effect.Effect<Option.Option<Cursor>, FailedToLoadCheckpoint>

  readonly saveCheckpoint: (name: string, cursor: Cursor) => Effect.Effect<void, FailedToSaveCheckpoint>

  readonly query: <Filter extends EventFilter>(
    filter: Filter,
  ) => Effect.Effect<
    Option.Option<{
      readonly events: Array.NonEmptyReadonlyArray<EventsForFilter<Filter>>
      readonly lastKnownPosition: Position
    }>,
    FailedToGetEvents
  >

  readonly append: (event: Event) => Effect.Effect<void, FailedToCommitEvent>

  readonly appendIf: (
    event: Event,
    condition: { filter: EventFilter; lastKnownPosition: Option.Option<Position> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}

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
