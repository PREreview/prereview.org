import { type Array, Context, Data, Effect, type Option, Schema, pipe, Stream } from 'effect'
import type { Event, EventFilter, EventsForFilter } from './Events.ts'

export const EventStore = Context.Service<EventStore>('EventStore')

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export const Position = pipe(Schema.Number, Schema.brand('Position'))

export type Position = typeof Position.Type

export interface Page {
  readonly events: Array.NonEmptyReadonlyArray<Event>
  readonly lastKnownPosition: Position
}

export interface EventStore {
  readonly all: Stream.Stream<Page, FailedToGetEvents>

  readonly since: (lastKnownPosition: Position) => Stream.Stream<Page, FailedToGetEvents>

  readonly streamSince: (lastKnownPosition: Option.Option<Position>) => Stream.Stream<Page, FailedToGetEvents>

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

export const streamSince = (...args: Parameters<(typeof EventStore.Service)['streamSince']>) =>
  Stream.unwrap(EventStore.useSync(service => service.streamSince(...args)))

export const append = (...args: Parameters<(typeof EventStore.Service)['append']>) =>
  EventStore.use(service => service.append(...args))

export const appendIf = (...args: Parameters<(typeof EventStore.Service)['appendIf']>) =>
  EventStore.use(service => service.appendIf(...args))

export const query = Effect.fnUntraced(function* <Filter extends EventFilter>(filter: Filter) {
  const eventStore = yield* EventStore

  return yield* eventStore.query(filter)
})
