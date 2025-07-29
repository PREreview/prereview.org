import { Array, Effect, Layer, Match, Option, pipe, PubSub, Queue, Schedule, Struct } from 'effect'
import { EventStore } from '../EventStore.js'
import * as ReviewPage from '../review-page/index.js'
import type { Uuid } from '../types/index.js'
import {
  CommentEvents,
  UnableToHandleCommand,
  UnableToQuery,
  type CreateRecordOnZenodoForComment,
  type DoesUserHaveAVerifiedEmailAddress,
  type GetComment,
  type GetNextExpectedCommandForUser,
  type GetNextExpectedCommandForUserOnAComment,
  type HandleCommentCommand,
  type PublishCommentOnZenodo,
} from './Context.js'
import { DecideComment } from './Decide.js'
import { CommentEventTypes, type CommentEvent } from './Events.js'
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
  EventStore | CommentEvents
> = Effect.gen(function* () {
  const eventStore = yield* EventStore
  const commentEvents = yield* CommentEvents

  return command =>
    Effect.gen(function* () {
      const { events, lastKnownEvent } = yield* pipe(
        eventStore.query({
          types: CommentEventTypes,
          predicates: { commentId: command.commentId },
        }),
        Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: [], lastKnownEvent: undefined })),
      )

      const state = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
      )

      yield* pipe(
        DecideComment(state)(command),
        Effect.tap(
          Option.match({
            onNone: () => Effect.void,
            onSome: event =>
              eventStore.append(event, {
                filter: {
                  types: CommentEventTypes,
                  predicates: { commentId: command.commentId },
                },
                lastKnownEvent: Option.fromNullable(lastKnownEvent),
              }),
          }),
        ),
        Effect.tap(
          Option.match({
            onNone: () => Effect.void,
            onSome: event => PubSub.publish(commentEvents, { commentId: command.commentId, event }),
          }),
        ),
      )
    }).pipe(
      Effect.catchTag(
        'FailedToCommitEvent',
        'FailedToGetEvents',
        'NewEventsFound',
        cause => new UnableToHandleCommand({ cause }),
      ),
    )
})

export const makeGetComment: Effect.Effect<typeof GetComment.Service, never, EventStore> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return commentId =>
    Effect.gen(function* () {
      const events = yield* pipe(
        eventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
        Effect.andThen(Struct.get('events')),
        Effect.catchTag('NoEventsFound', () => Effect.succeed(Array.empty())),
      )

      return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
      )
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const makeGetNextExpectedCommandForUser: Effect.Effect<
  typeof GetNextExpectedCommandForUser.Service,
  never,
  EventStore
> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* pipe(
        eventStore.query({ types: CommentEventTypes }),
        Effect.andThen(Struct.get('events')),
        Effect.catchTag('NoEventsFound', () => Effect.succeed(Array.empty())),
      )

      return Queries.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })
    }).pipe(Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })))
})

export const makeGetNextExpectedCommandForUserOnAComment: Effect.Effect<
  typeof GetNextExpectedCommandForUserOnAComment.Service,
  never,
  EventStore
> = Effect.gen(function* () {
  const eventStore = yield* EventStore

  return commentId =>
    Effect.gen(function* () {
      const events = yield* pipe(
        eventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
        Effect.andThen(Struct.get('events')),
        Effect.catchTag('NoEventsFound', () => Effect.succeed(Array.empty())),
      )

      return Queries.GetNextExpectedCommandForUserOnAComment(events)(commentId)
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
  | PublishCommentOnZenodo
  | ReviewPage.CommentsForReview
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const commentEvents = yield* CommentEvents
    const eventStore = yield* EventStore
    const dequeue = yield* PubSub.subscribe(commentEvents)

    yield* pipe(
      eventStore.query({ types: ['PublicationOfCommentWasRequested', 'CommentWasAssignedADoi'] }),
      Effect.andThen(Struct.get('events')),
      Effect.andThen(events => Queries.GetACommentInNeedOfADoi(events)),
      Effect.bindTo('commentId'),
      Effect.bind('inputForCommentZenodoRecord', ({ commentId }) =>
        pipe(
          eventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
          Effect.andThen(Struct.get('events')),
          Effect.andThen(Queries.buildInputForCommentZenodoRecord),
        ),
      ),
      Effect.andThen(React.AssignCommentADoiWhenPublicationWasRequested),
      Effect.catchTag('NoEventsFound', 'NoCommentsInNeedOfADoi', () => Effect.void),
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
          Match.when({ event: { _tag: 'PublicationOfCommentWasRequested' } }, ({ commentId }) =>
            pipe(
              eventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
              Effect.andThen(Struct.get('events')),
              Effect.andThen(Queries.buildInputForCommentZenodoRecord),
              Effect.andThen(inputForCommentZenodoRecord =>
                React.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
              ),
            ),
          ),
          Match.when({ event: { _tag: 'CommentWasAssignedADoi' } }, ({ event }) =>
            React.PublishCommentWhenCommentWasAssignedADoi(event),
          ),
          Match.when({ event: { _tag: 'CommentWasPublished' } }, ({ commentId }) =>
            pipe(
              eventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
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
