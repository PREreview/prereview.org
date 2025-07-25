import { type Array, Context, Data, type Effect, type Option } from 'effect'
import type { Event } from './Events.js'
import type { Uuid } from './types/index.js'

export const EventStore = Context.GenericTag<EventStore>('EventStore')

export class NoEventsFound extends Data.TaggedClass('NoEventsFound') {}

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export interface EventFilter<T extends Event['_tag']> {
  types: Array.NonEmptyReadonlyArray<T>
  predicates?: Partial<Omit<Event, '_tag'>>
}

export interface EventStore {
  readonly all: Effect.Effect<ReadonlyArray<Event>, FailedToGetEvents>

  readonly query: <Tag extends Event['_tag']>(
    filter: EventFilter<Tag>,
  ) => Effect.Effect<
    { readonly events: Array.NonEmptyReadonlyArray<Extract<Event, { _tag: Tag }>>; readonly lastKnownEvent: Uuid.Uuid },
    NoEventsFound | FailedToGetEvents
  >

  readonly append: <Tag extends Event['_tag']>(
    event: Event,
    condition?: { filter: EventFilter<Tag>; lastKnownEvent: Option.Option<Uuid.Uuid> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}
