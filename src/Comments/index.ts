import { Array, Effect, Layer, Match, pipe, PubSub, Queue, Schedule, Struct } from 'effect'
import * as ReviewPage from '../review-page/index.js'
import type { Uuid } from '../types/index.js'
import {
  CommentEvents,
  CommentEventStore,
  type CreateRecordOnZenodoForComment,
  type DoesUserHaveAVerifiedEmailAddress,
  type GetComment,
  type GetNextExpectedCommandForUser,
  type GetNextExpectedCommandForUserOnAComment,
  type HandleCommentCommand,
  type PublishCommentOnZenodo,
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
  CommentEventStore | CommentEvents
> = Effect.gen(function* () {
  const eventStore = yield* CommentEventStore
  const commentEvents = yield* CommentEvents

  return ({ commentId, command }) =>
    Effect.gen(function* () {
      const { events, latestVersion } = yield* eventStore.getEvents(commentId)

      const state = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
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
      Effect.catchTag(
        'FailedToCommitEvent',
        'FailedToGetEvents',
        'ResourceHasChanged',
        cause => new UnableToHandleCommand({ cause }),
      ),
    )
})

export const makeGetComment: Effect.Effect<typeof GetComment.Service, never, CommentEventStore> = Effect.gen(
  function* () {
    const eventStore = yield* CommentEventStore

    return commentId =>
      Effect.gen(function* () {
        const { events } = yield* eventStore.getEvents(commentId)

        return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
          EvolveComment(state)(event),
        )
      }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
  },
)

export const makeGetNextExpectedCommandForUser: Effect.Effect<
  typeof GetNextExpectedCommandForUser.Service,
  never,
  CommentEventStore
> = Effect.gen(function* () {
  const eventStore = yield* CommentEventStore

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const makeGetNextExpectedCommandForUserOnAComment: Effect.Effect<
  typeof GetNextExpectedCommandForUserOnAComment.Service,
  never,
  CommentEventStore
> = Effect.gen(function* () {
  const eventStore = yield* CommentEventStore

  return commentId =>
    Effect.gen(function* () {
      const events = yield* eventStore.getAllEvents

      return Queries.GetNextExpectedCommandForUserOnAComment(events)(commentId)
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const ReactToCommentEvents: Layer.Layer<
  never,
  never,
  | CommentEvents
  | CommentEventStore
  | GetComment
  | HandleCommentCommand
  | DoesUserHaveAVerifiedEmailAddress
  | CreateRecordOnZenodoForComment
  | PublishCommentOnZenodo
  | ReviewPage.CommentsForReview
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const commentEvents = yield* CommentEvents
    const eventStore = yield* CommentEventStore
    const dequeue = yield* PubSub.subscribe(commentEvents)

    yield* pipe(
      eventStore.getAllEvents,
      Effect.andThen(events => Queries.GetACommentInNeedOfADoi(events)),
      Effect.bindTo('commentId'),
      Effect.bind('inputForCommentZenodoRecord', ({ commentId }) =>
        pipe(
          eventStore.getEvents(commentId),
          Effect.andThen(Struct.get('events')),
          Effect.andThen(Queries.buildInputForCommentZenodoRecord),
        ),
      ),
      Effect.andThen(React.AssignCommentADoiWhenPublicationWasRequested),
      Effect.catchTag('NoCommentsInNeedOfADoi', () => Effect.void),
      Effect.catchAll(error => Effect.annotateLogs(Effect.logError('ReactToCommentEvents on timer failed'), { error })),
      Effect.repeat(Schedule.fixed('1 minute')),
      Effect.fork,
    )

    return yield* pipe(
      Queue.take(dequeue),
      Effect.tap(({ commentId }) => Effect.annotateLogsScoped({ commentId })),
      Effect.andThen(
        pipe(
          Match.type<{ commentId: Uuid.Uuid; event: CommentEvent }>(),
          Match.when({ event: { _tag: 'CommentWasStarted' } }, ({ commentId }) =>
            React.CheckIfUserHasAVerifiedEmailAddress(commentId),
          ),
          Match.when({ event: { _tag: 'CommentPublicationWasRequested' } }, ({ commentId }) =>
            pipe(
              eventStore.getEvents(commentId),
              Effect.andThen(Struct.get('events')),
              Effect.andThen(Queries.buildInputForCommentZenodoRecord),
              Effect.andThen(inputForCommentZenodoRecord =>
                React.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
              ),
            ),
          ),
          Match.when({ event: { _tag: 'DoiWasAssigned' } }, ({ commentId, event }) =>
            React.PublishCommentWhenDoiWasAssigned({ commentId, event }),
          ),
          Match.when({ event: { _tag: 'CommentWasPublished' } }, ({ commentId }) =>
            pipe(
              eventStore.getEvents(commentId),
              Effect.andThen(eventsForComment => Queries.GetPrereviewId(eventsForComment.events)),
              Effect.andThen(prereviewId =>
                Effect.gen(function* () {
                  const commentsForReview = yield* ReviewPage.CommentsForReview

                  yield* commentsForReview.invalidate(prereviewId)
                }),
              ),
            ),
          ),
          Match.orElse(() => Effect.void),
        ),
      ),
      Effect.catchAll(error => Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { error })),
      Effect.scoped,
      Effect.forever,
    )
  }),
)
