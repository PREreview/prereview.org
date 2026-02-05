import { type Array, Context, Data, Effect, type Option, Schema, type Types, pipe } from 'effect'
import type { Event, EventFilter } from './Events.ts'

export const EventStore = Context.GenericTag<EventStore>('EventStore')

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export const Position = pipe(Schema.Number, Schema.brand('Position'))

export type Position = typeof Position.Type

export interface EventStore {
  readonly all: Effect.Effect<
    Option.Option<{ readonly events: Array.NonEmptyReadonlyArray<Event>; readonly lastKnownPosition: Position }>,
    FailedToGetEvents
  >

  readonly since: (
    lastKnownPosition: Position,
  ) => Effect.Effect<
    Option.Option<{ readonly events: Array.NonEmptyReadonlyArray<Event>; readonly lastKnownPosition: Position }>,
    FailedToGetEvents
  >

  readonly query: <Tag extends Types.Tags<Event>>(
    filter: EventFilter<Tag>,
  ) => Effect.Effect<
    Option.Option<{
      readonly events: Array.NonEmptyReadonlyArray<Types.ExtractTag<Event, Tag>>
      readonly lastKnownPosition: Position
    }>,
    FailedToGetEvents
  >

  readonly append: <Tag extends Types.Tags<Event>>(
    event: Event,
    condition?: { filter: EventFilter<Tag>; lastKnownPosition: Option.Option<Position> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}

export const { all } = Effect.serviceConstants(EventStore)

export const { since } = Effect.serviceFunctions(EventStore)

export const query = Effect.fn(function* <Tag extends Types.Tags<Event>>(filter: EventFilter<Tag>) {
  const eventStore = yield* EventStore

  return yield* eventStore.query(filter)
})

export const append = Effect.fn(function* <Tag extends Types.Tags<Event>>(
  event: Event,
  condition?: { filter: EventFilter<Tag>; lastKnownPosition: Option.Option<Position> },
) {
  const eventStore = yield* EventStore

  return yield* eventStore.append(event, condition)
})
