import { Array, Effect, Layer, Match, pipe, PubSub, Queue } from 'effect'
import { EventStore } from '../Context.js'
import type { Uuid } from '../types/index.js'
import {
  FeedbackEvents,
  type GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  type GetFeedback,
  type HandleFeedbackCommand,
  type PublishFeedbackWithADoi,
  UnableToHandleCommand,
  UnableToQuery,
} from './Context.js'
import { DecideFeedback } from './Decide.js'
import type { FeedbackEvent } from './Events.js'
import { EvolveFeedback } from './Evolve.js'
import * as Queries from './Queries.js'
import { OnFeedbackPublicationWasRequested } from './React.js'
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
        Effect.tap(
          Array.match({
            onEmpty: () => Effect.void,
            onNonEmpty: events => eventStore.commitEvents(feedbackId, latestVersion)(...events),
          }),
        ),
        Effect.andThen(Effect.forEach(event => PubSub.publish(feedbackEvents, { feedbackId, event }))),
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

export const ReactToFeedbackEvents: Layer.Layer<
  never,
  never,
  FeedbackEvents | GetFeedback | HandleFeedbackCommand | PublishFeedbackWithADoi
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const feedbackEvents = yield* FeedbackEvents
    const dequeue = yield* PubSub.subscribe(feedbackEvents)

    yield* pipe(
      Queue.take(dequeue),
      Effect.andThen(
        pipe(
          Match.type<{ feedbackId: Uuid.Uuid; event: FeedbackEvent }>(),
          Match.when({ event: { _tag: 'FeedbackPublicationWasRequested' } }, ({ feedbackId, event }) =>
            pipe(
              OnFeedbackPublicationWasRequested({ feedbackId, event }),
              Effect.tapError(() =>
                Effect.annotateLogs(Effect.logError('ReactToFeedbackEvents failed'), { feedbackId }),
              ),
            ),
          ),
          Match.orElse(() => Effect.void),
        ),
      ),
      Effect.catchAll(() => Effect.void),
      Effect.forever,
    )
  }),
)
