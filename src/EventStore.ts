import { Data, type Effect } from 'effect'
import type { Uuid } from 'uuid-ts'
import type { FeedbackEvent } from './Feedback/index.js'

export class FailedToGetEvents extends Data.TaggedError('FailedToGetEvents') {}

export class FailedToCommitEvent extends Data.TaggedError('FailedToCommitEvent') {}

export interface EventStore {
  readonly getEvents: (
    resourceId: Uuid,
  ) => Effect.Effect<
    { readonly events: ReadonlyArray<FeedbackEvent>; readonly latestVersion: number },
    FailedToGetEvents
  >

  readonly commitEvent: (
    resourceId: Uuid,
    lastKnownVersion: number,
  ) => (event: FeedbackEvent) => Effect.Effect<number, FailedToCommitEvent>
}
