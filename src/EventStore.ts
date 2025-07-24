import { type Array, Data, type Effect, type Option } from 'effect'
import type { Uuid } from './types/index.js'

export class NoEventsFound extends Data.TaggedClass('NoEventsFound') {}

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class NewEventsFound extends Data.TaggedError('NewEventsFound') {}

export interface EventFilter<A extends { readonly _tag: string }, T extends A['_tag']> {
  types: Array.NonEmptyReadonlyArray<T>
  predicates?: Partial<Omit<A, '_tag'>>
}

export interface EventStore<T extends { readonly _tag: string }> {
  readonly all: Effect.Effect<ReadonlyArray<T>, FailedToGetEvents>

  readonly query: <Tag extends T['_tag']>(
    filter: EventFilter<T, Tag>,
  ) => Effect.Effect<
    { readonly events: Array.NonEmptyReadonlyArray<Extract<T, { _tag: Tag }>>; readonly lastKnownEvent: Uuid.Uuid },
    NoEventsFound | FailedToGetEvents
  >

  readonly append: <Tag extends T['_tag']>(
    event: T,
    condition?: { filter: EventFilter<T, Tag>; lastKnownEvent: Option.Option<Uuid.Uuid> },
  ) => Effect.Effect<void, NewEventsFound | FailedToCommitEvent>
}
