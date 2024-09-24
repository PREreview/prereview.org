import { Array, Context, Data, Effect, pipe, type Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from 'uuid-ts'
import { EventStore } from '../Context.js'
import type { FeedbackCommand } from './Commands.js'
import { DecideFeedback } from './Decide.js'
import type { FeedbackError } from './Errors.js'
import { EvolveFeedback } from './Evolve.js'
import * as Queries from './Queries.js'
import {
  type FeedbackInProgress,
  FeedbackNotStarted,
  type FeedbackReadyForPublishing,
  type FeedbackState,
} from './State.js'

export * from './Commands.js'
export * from './Decide.js'
export * from './Errors.js'
export * from './Events.js'
export * from './Evolve.js'
export * from './State.js'

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: Error }> {}

export class HandleFeedbackCommand extends Context.Tag('HandleFeedbackCommand')<
  HandleFeedbackCommand,
  (params: {
    readonly feedbackId: Uuid
    readonly command: FeedbackCommand
  }) => Effect.Effect<void, UnableToHandleCommand | FeedbackError>
>() {}

export const makeHandleFeedbackCommand: Effect.Effect<typeof HandleFeedbackCommand.Service, never, EventStore> =
  Effect.gen(function* () {
    const eventStore = yield* EventStore

    return ({ feedbackId, command }) =>
      Effect.gen(function* () {
        const { events, latestVersion } = yield* eventStore.getEvents(feedbackId)

        const state = Array.reduce(events, new FeedbackNotStarted() as FeedbackState, (state, event) =>
          EvolveFeedback(state)(event),
        )

        yield* pipe(DecideFeedback(state)(command), Effect.andThen(eventStore.commitEvent(feedbackId, latestVersion)))
      }).pipe(
        Effect.catchTags({
          FailedToCommitEvent: cause => new UnableToHandleCommand({ cause }),
          FailedToGetEvents: cause => new UnableToHandleCommand({ cause }),
          ResourceHasChanged: cause => new UnableToHandleCommand({ cause }),
        }),
      )
  })

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: Error }> {}

export class GetFeedback extends Context.Tag('GetFeedback')<
  GetFeedback,
  (feedbackId: Uuid) => Effect.Effect<FeedbackState, UnableToQuery>
>() {}

export const makeGetFeedback: Effect.Effect<typeof GetFeedback.Service, never, EventStore> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return feedbackId =>
    Effect.gen(function* () {
      const { events } = yield* eventStore.getEvents(feedbackId)

      return Array.reduce(events, new FeedbackNotStarted() as FeedbackState, (state, event) =>
        EvolveFeedback(state)(event),
      )
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export class GetAllUnpublishedFeedbackByAnAuthorForAPrereview extends Context.Tag(
  'GetAllUnpublishedFeedbackByAnAuthorForAPrereview',
)<
  GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  (params: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }) => Effect.Effect<Record.ReadonlyRecord<Uuid, FeedbackInProgress | FeedbackReadyForPublishing>, UnableToQuery>
>() {}

export const makeGetAllUnpublishedFeedbackByAnAuthorForAPrereview: Effect.Effect<
  typeof GetAllUnpublishedFeedbackByAnAuthorForAPrereview.Service,
  never,
  EventStore
> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetAllUnpublishedFeedbackByAnAuthorForAPrereview(events)({ authorId, prereviewId })
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})
