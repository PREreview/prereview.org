import { type Array, Context, Data, type Effect } from 'effect'
import type { CommentEvent } from './Comments/index.js'
import type { Uuid } from './types/index.js'

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents')<{ cause?: Error }> {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent')<{ cause?: Error }> {}

export class ResourceHasChanged extends Data.TaggedError('ResourceHasChanged') {}

export interface EventStore {
  readonly getAllEvents: (
    resourceType: 'Comment',
  ) => Effect.Effect<
    ReadonlyArray<{ readonly event: CommentEvent; readonly version: number; readonly resourceId: Uuid.Uuid }>,
    FailedToGetEvents
  >

  readonly getEvents: (
    resourceType: 'Comment',
    resourceId: Uuid.Uuid,
  ) => Effect.Effect<
    { readonly events: ReadonlyArray<CommentEvent>; readonly latestVersion: number },
    FailedToGetEvents
  >

  readonly commitEvents: (
    resourceType: 'Comment',
    resourceId: Uuid.Uuid,
    lastKnownVersion: number,
  ) => (
    ...event: Array.NonEmptyReadonlyArray<CommentEvent>
  ) => Effect.Effect<number, ResourceHasChanged | FailedToCommitEvent>
}

export const EventStore = Context.GenericTag<EventStore>('EventStore')
