import { Array, Effect, Layer, Match, pipe, PubSub, Queue } from 'effect'
import { EventStore } from '../Context.js'
import type { Uuid } from '../types/index.js'
import {
  type AssignFeedbackADoi,
  CommentEvents,
  type GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
  type GetComment,
  type HandleFeedbackCommand,
  type PublishFeedbackWithADoi,
  UnableToHandleCommand,
  UnableToQuery,
} from './Context.js'
import { DecideComment } from './Decide.js'
import type { CommentEvent } from './Events.js'
import { EvolveComment } from './Evolve.js'
import * as Queries from './Queries.js'
import { OnCommentPublicationWasRequested, OnDoiWasAssigned } from './React.js'
import { CommentNotStarted, type CommentState } from './State.js'

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
  EventStore | CommentEvents
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const commentEvents = yield* CommentEvents

  return ({ feedbackId, command }) =>
    Effect.gen(function* () {
      const { events, latestVersion } = yield* eventStore.getEvents(feedbackId)

      const state = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
      )

      yield* pipe(
        DecideComment(state)(command),
        Effect.tap(
          Array.match({
            onEmpty: () => Effect.void,
            onNonEmpty: events => eventStore.commitEvents(feedbackId, latestVersion)(...events),
          }),
        ),
        Effect.andThen(Effect.forEach(event => PubSub.publish(commentEvents, { commentId: feedbackId, event }))),
      )
    }).pipe(
      Effect.catchTags({
        FailedToCommitEvent: cause => new UnableToHandleCommand({ cause }),
        FailedToGetEvents: cause => new UnableToHandleCommand({ cause }),
        ResourceHasChanged: cause => new UnableToHandleCommand({ cause }),
      }),
    )
})

export const makeGetComment: Effect.Effect<typeof GetComment.Service, never, EventStore> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return commentId =>
    Effect.gen(function* () {
      const { events } = yield* eventStore.getEvents(commentId)

      return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
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

export const ReactToCommentEvents: Layer.Layer<
  never,
  never,
  CommentEvents | GetComment | HandleFeedbackCommand | AssignFeedbackADoi | PublishFeedbackWithADoi
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const commentEvents = yield* CommentEvents
    const dequeue = yield* PubSub.subscribe(commentEvents)

    yield* pipe(
      Queue.take(dequeue),
      Effect.andThen(
        pipe(
          Match.type<{ commentId: Uuid.Uuid; event: CommentEvent }>(),
          Match.when({ event: { _tag: 'CommentPublicationWasRequested' } }, ({ commentId, event }) =>
            pipe(
              OnCommentPublicationWasRequested({ commentId, event }),
              Effect.tapError(() => Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { commentId })),
            ),
          ),
          Match.when({ event: { _tag: 'DoiWasAssigned' } }, ({ commentId, event }) =>
            pipe(
              OnDoiWasAssigned({ commentId, event }),
              Effect.tapError(() => Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { commentId })),
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
