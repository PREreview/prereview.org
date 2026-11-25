import { type Array, Data, type Effect, type Option, pipe, Schema, type Stream } from 'effect'
import type { AnyEvent, EventFilter, EventsForFilter } from './EventFilter.ts'

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export class FailedToLoadCheckpoint extends Data.TaggedError('FailedToLoadCheckpoint')<{ cause?: Error }> {}

export class FailedToSaveCheckpoint extends Data.TaggedError('FailedToSaveCheckpoint')<{ cause?: Error }> {}

export const Position = pipe(Schema.Number, Schema.brand('Position'))

export type Position = typeof Position.Type

export const Cursor = pipe(Schema.String, Schema.brand('Cursor'))

export type Cursor = typeof Cursor.Type

export interface RecordedEvent<E extends AnyEvent> {
  readonly event: E
  readonly cursor: Cursor
}

export type Page<E extends AnyEvent> = Array.NonEmptyReadonlyArray<RecordedEvent<E>>

export interface EventStore<E extends AnyEvent> {
  readonly all: Stream.Stream<Page<E>, FailedToGetEvents>

  readonly since: (cursor: Cursor, filter?: EventFilter<E>) => Stream.Stream<Page<E>, FailedToGetEvents>

  readonly subscribe: (options?: {
    readonly after?: Cursor
    readonly filter?: EventFilter<E>
  }) => Stream.Stream<Page<E>, FailedToGetEvents>

  readonly latestCursor: Effect.Effect<Cursor, FailedToGetEvents>

  readonly loadCheckpoint: (name: string) => Effect.Effect<Option.Option<Cursor>, FailedToLoadCheckpoint>

  readonly saveCheckpoint: (name: string, cursor: Cursor) => Effect.Effect<void, FailedToSaveCheckpoint>

  readonly query: <Filter extends EventFilter<E>>(
    filter: Filter,
  ) => Effect.Effect<
    Option.Option<{
      readonly events: Array.NonEmptyReadonlyArray<EventsForFilter<E, Filter>>
      readonly lastKnownPosition: Position
    }>,
    FailedToGetEvents
  >

  readonly append: (event: E) => Effect.Effect<void, FailedToCommitEvent>

  readonly appendIf: (
    event: E,
    condition: { filter: EventFilter<E>; lastKnownPosition: Option.Option<Position> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}
