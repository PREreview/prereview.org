import { type Array, Data, type Effect } from 'effect'
import type { Uuid } from './types/index.js'

export class NoEventsFound extends Data.TaggedClass('NoEventsFound') {}

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class ResourceHasChanged extends Data.TaggedError('ResourceHasChanged') {}

export interface EventFilter<A extends { readonly _tag: string }, T extends A['_tag']> {
  types: Array.NonEmptyReadonlyArray<T>
  predicates?: Partial<Omit<A, '_tag'>>
}

export interface EventStore<T extends { readonly _tag: string }> {
  readonly all: Effect.Effect<ReadonlyArray<T>, FailedToGetEvents>

  readonly query: <Tag extends T['_tag']>(
    filter: EventFilter<T, Tag>,
  ) => Effect.Effect<
    { readonly events: Array.NonEmptyReadonlyArray<Extract<T, { _tag: Tag }>> },
    NoEventsFound | FailedToGetEvents
  >

  readonly getAllEventsOfType: <Type extends T['_tag']>(
    ...types: Array.NonEmptyReadonlyArray<Type>
  ) => Effect.Effect<
    ReadonlyArray<{
      readonly event: Extract<T, { _tag: Type }>
      readonly version: number
      readonly resourceId: Uuid.Uuid
    }>,
    FailedToGetEvents
  >

  readonly getEvents: (
    resourceId: Uuid.Uuid,
  ) => Effect.Effect<{ readonly events: ReadonlyArray<T>; readonly latestVersion: number }, FailedToGetEvents>

  readonly commitEvent: (
    resourceId: Uuid.Uuid,
    lastKnownVersion: number,
  ) => (event: T) => Effect.Effect<number, ResourceHasChanged | FailedToCommitEvent>
}
