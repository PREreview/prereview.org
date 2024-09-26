import { Array, Effect, pipe, PubSub } from 'effect'
import { EventStore } from '../Context.js'
import {
  FeedbackEvents,
  type GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  type GetFeedback,
  type HandleFeedbackCommand,
  UnableToHandleCommand,
  UnableToQuery,
} from './Context.js'
import { DecideFeedback } from './Decide.js'
import { EvolveFeedback } from './Evolve.js'
import * as Queries from './Queries.js'
import { FeedbackNotStarted, type FeedbackState } from './State.js'

export * from './Commands.js'
export * from './Context.js'
export * from './Decide.js'
export * from './Errors.js'
export * from './Events.js'
export * from './Evolve.js'
export * from './State.js'

export const makeHandleFeedbackCommand: Effect.Effect<
  typeof HandleFeedbackCommand.Service,
  never,
  EventStore | FeedbackEvents
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const feedbackEvents = yield* FeedbackEvents

  return ({ feedbackId, command }) =>
    Effect.gen(function* () {
      const { events, latestVersion } = yield* eventStore.getEvents(feedbackId)

      const state = Array.reduce(events, new FeedbackNotStarted() as FeedbackState, (state, event) =>
        EvolveFeedback(state)(event),
      )

      yield* pipe(
        DecideFeedback(state)(command),
        Effect.tap(eventStore.commitEvent(feedbackId, latestVersion)),
        Effect.andThen(event => PubSub.publish(feedbackEvents, { feedbackId, event })),
      )
    }).pipe(
      Effect.catchTags({
        FailedToCommitEvent: cause => new UnableToHandleCommand({ cause }),
        FailedToGetEvents: cause => new UnableToHandleCommand({ cause }),
        ResourceHasChanged: cause => new UnableToHandleCommand({ cause }),
      }),
    )
})

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
