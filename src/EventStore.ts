import { Data, type Effect } from 'effect'
import type { FeedbackEvent } from './Feedback/index.js'
import type { Uuid } from './types/index.js'

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents') {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent') {}

export class ResourceHasChanged extends Data.TaggedError('ResourceHasChanged') {}

export interface EventStore {
  readonly getAllEvents: Effect.Effect<
    ReadonlyArray<{ readonly event: FeedbackEvent; readonly version: number; readonly resourceId: Uuid.Uuid }>,
    FailedToGetEvents
  >

  readonly getEvents: (
    resourceId: Uuid.Uuid,
  ) => Effect.Effect<
    { readonly events: ReadonlyArray<FeedbackEvent>; readonly latestVersion: number },
    FailedToGetEvents
  >

  readonly commitEvent: (
    resourceId: Uuid.Uuid,
    lastKnownVersion: number,
  ) => (event: FeedbackEvent) => Effect.Effect<number, ResourceHasChanged | FailedToCommitEvent>
}
