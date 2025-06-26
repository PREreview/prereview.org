import { type Array, Data, type Effect } from 'effect'
import type { Uuid } from './types/index.js'

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class ResourceHasChanged extends Data.TaggedError('ResourceHasChanged') {}

export interface EventStore<T extends { readonly _tag: string }> {
  readonly getAllEvents: Effect.Effect<
    ReadonlyArray<{ readonly event: T; readonly version: number; readonly resourceId: Uuid.Uuid }>,
    FailedToGetEvents
  >

  readonly getAllEventsOfType: <Type extends T['_tag']>(
    ...types: ReadonlyArray<Type>
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

  readonly commitEvents: (
    resourceId: Uuid.Uuid,
    lastKnownVersion: number,
  ) => (...event: Array.NonEmptyReadonlyArray<T>) => Effect.Effect<number, ResourceHasChanged | FailedToCommitEvent>
}
