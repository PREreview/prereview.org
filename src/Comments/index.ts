import { Array, Effect, Layer, Match, pipe, PubSub, Queue, Schedule } from 'effect'
import { EventStore } from '../Context.js'
import { RequiresAVerifiedEmailAddress } from '../feature-flags.js'
import type { Uuid } from '../types/index.js'
import {
  CommentEvents,
  type CreateRecordOnZenodoForComment,
  type DoesUserHaveAVerifiedEmailAddress,
  type GetComment,
  type GetNextExpectedCommandForUser,
  type GetNextExpectedCommandForUserOnAComment,
  type HandleCommentCommand,
  type PublishCommentWithADoi,
  UnableToHandleCommand,
  UnableToQuery,
} from './Context.js'
import { DecideComment } from './Decide.js'
import type { CommentEvent } from './Events.js'
import { EvolveComment } from './Evolve.js'
import * as Queries from './Queries.js'
import * as React from './React.js'
import { CommentNotStarted, type CommentState } from './State.js'

export * from './Commands.js'
export * from './Context.js'
export * from './Decide.js'
export * from './Errors.js'
export * from './Events.js'
export * from './Evolve.js'
export * from './ExpectedCommand.js'
export * from './State.js'

export const makeHandleCommentCommand: Effect.Effect<
  typeof HandleCommentCommand.Service,
  never,
  EventStore | CommentEvents | RequiresAVerifiedEmailAddress
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const commentEvents = yield* CommentEvents
  const requiresAVerifiedEmailAddress = yield* RequiresAVerifiedEmailAddress

  return ({ commentId, command }) =>
    Effect.gen(function* () {
      const { events, latestVersion } = yield* eventStore.getEvents(commentId)

      const state = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(requiresAVerifiedEmailAddress)(state)(event),
      )

      yield* pipe(
        DecideComment(state)(command),
        Effect.tap(
          Array.match({
            onEmpty: () => Effect.void,
            onNonEmpty: events => eventStore.commitEvents(commentId, latestVersion)(...events),
          }),
        ),
        Effect.andThen(Effect.forEach(event => PubSub.publish(commentEvents, { commentId, event }))),
      )
    }).pipe(
      Effect.catchTags({
        FailedToCommitEvent: cause => new UnableToHandleCommand({ cause }),
        FailedToGetEvents: cause => new UnableToHandleCommand({ cause }),
        ResourceHasChanged: cause => new UnableToHandleCommand({ cause }),
      }),
    )
})

export const makeGetComment: Effect.Effect<
  typeof GetComment.Service,
  never,
  EventStore | RequiresAVerifiedEmailAddress
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const requiresAVerifiedEmailAddress = yield* RequiresAVerifiedEmailAddress

  return commentId =>
    Effect.gen(function* () {
      const { events } = yield* eventStore.getEvents(commentId)

      return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(requiresAVerifiedEmailAddress)(state)(event),
      )
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const makeGetNextExpectedCommandForUser: Effect.Effect<
  typeof GetNextExpectedCommandForUser.Service,
  never,
  EventStore | RequiresAVerifiedEmailAddress
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const requiresAVerifiedEmailAddress = yield* RequiresAVerifiedEmailAddress

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetNextExpectedCommandForUser(requiresAVerifiedEmailAddress)(events)({ authorId, prereviewId })
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const makeGetNextExpectedCommandForUserOnAComment: Effect.Effect<
  typeof GetNextExpectedCommandForUserOnAComment.Service,
  never,
  EventStore | RequiresAVerifiedEmailAddress
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const requiresAVerifiedEmailAddress = yield* RequiresAVerifiedEmailAddress

  return commentId =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetNextExpectedCommandForUserOnAComment(requiresAVerifiedEmailAddress)(events)(commentId)
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const ReactToCommentEvents: Layer.Layer<
  never,
  never,
  | CommentEvents
  | EventStore
  | GetComment
  | HandleCommentCommand
  | DoesUserHaveAVerifiedEmailAddress
  | CreateRecordOnZenodoForComment
  | PublishCommentWithADoi
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const commentEvents = yield* CommentEvents
    const eventStore = yield* EventStore
    const dequeue = yield* PubSub.subscribe(commentEvents)

    yield* Effect.all(
      [
        Effect.repeat(
          pipe(
            eventStore.getAllEvents,
            Effect.andThen(events => Queries.GetACommentInNeedOfADoi(events)),
            Effect.andThen(React.AssignCommentADoiWhenPublicationWasRequested),
            Effect.catchTag('NoCommentsInNeedOfADoi', () => Effect.void),
            Effect.catchAll(error =>
              Effect.annotateLogs(Effect.logError('ReactToCommentEvents on timer failed'), { error }),
            ),
          ),
          Schedule.fixed('1 minute'),
        ),
        pipe(
          Queue.take(dequeue),
          Effect.andThen(
            pipe(
              Match.type<{ commentId: Uuid.Uuid; event: CommentEvent }>(),
              Match.when({ event: { _tag: 'CommentWasStarted' } }, ({ commentId }) =>
                pipe(
                  React.CheckIfUserHasAVerifiedEmailAddress(commentId),
                  Effect.tapError(() =>
                    Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { commentId }),
                  ),
                ),
              ),
              Match.when({ event: { _tag: 'CommentPublicationWasRequested' } }, ({ commentId }) =>
                pipe(
                  eventStore.getAllEvents,
                  Effect.andThen(events => Queries.GetACommentInNeedOfADoi(events)),
                  Effect.andThen(React.AssignCommentADoiWhenPublicationWasRequested),
                  Effect.tapError(() =>
                    Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { commentId }),
                  ),
                ),
              ),
              Match.when({ event: { _tag: 'DoiWasAssigned' } }, ({ commentId, event }) =>
                pipe(
                  React.PublishCommentWhenDoiWasAssigned({ commentId, event }),
                  Effect.tapError(() =>
                    Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { commentId }),
                  ),
                ),
              ),
              Match.orElse(() => Effect.void),
            ),
          ),
          Effect.catchAll(() => Effect.void),
          Effect.forever,
        ),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)
