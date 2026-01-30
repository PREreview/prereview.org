import { type Array, Context, Data, Effect, type Option, type Types } from 'effect'
import type { Event, EventFilter } from './Events.ts'
import type { Uuid } from './types/index.ts'

export const EventStore = Context.GenericTag<EventStore>('EventStore')

export class NoEventsFound extends Data.TaggedClass('NoEventsFound') {}

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export interface EventStore {
  readonly all: Effect.Effect<ReadonlyArray<Event>, FailedToGetEvents>

  readonly query: <Tag extends Types.Tags<Event>>(
    filter: EventFilter<Tag>,
  ) => Effect.Effect<
    { readonly events: Array.NonEmptyReadonlyArray<Types.ExtractTag<Event, Tag>>; readonly lastKnownEvent: Uuid.Uuid },
    NoEventsFound | FailedToGetEvents
  >

  readonly append: <Tag extends Types.Tags<Event>>(
    event: Event,
    condition?: { filter: EventFilter<Tag>; lastKnownEvent: Option.Option<Uuid.Uuid> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}

export const { all } = Effect.serviceConstants(EventStore)

export const query = Effect.fn(function* <Tag extends Types.Tags<Event>>(filter: EventFilter<Tag>) {
  const eventStore = yield* EventStore

  return yield* eventStore.query(filter)
})

export const append = Effect.fn(function* <Tag extends Types.Tags<Event>>(
  event: Event,
  condition?: { filter: EventFilter<Tag>; lastKnownEvent: Option.Option<Uuid.Uuid> },
) {
  const eventStore = yield* EventStore

  return yield* eventStore.append(event, condition)
})
