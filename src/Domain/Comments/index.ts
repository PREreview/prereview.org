import { Array, Context, Effect, Layer, Option, pipe, Scope, Struct } from 'effect'
import type { Sharding } from 'effect/cluster'
import type { WorkflowEngine } from 'effect/workflow'
import { EventSubscription } from '../../EventSourcing/index.ts'
import type { ContactEmailAddresses } from '../ContactEmailAddresses/index.ts'
import { Commands, EventStore, Queries } from '../Events/index.ts'
import { layer as commentsServiceLayer } from './Comments.ts'
import {
  GetComment,
  GetNextExpectedCommandForUser,
  GetNextExpectedCommandForUserOnAComment,
  HandleCommentCommand,
  type CreateRecordOnZenodoForComment,
  type PublishCommentOnZenodo,
} from './Context.ts'
import { DecideComment } from './Decide.ts'
import { CommentEventTypes } from './Events.ts'
import { EvolveComment } from './Evolve.ts'
import * as CommentQueries from './Queries.ts'
import { CommentNotStarted, type CommentState } from './State.ts'
import * as Workflows from './Workflows/index.ts'
import { layerZenodo } from './Zenodo.ts'

export * from './Commands.ts'
export { Comments } from './Comments.ts'
export * from './Context.ts'
export * from './Decide.ts'
export * from './Errors.ts'
export * from './Events.ts'
export * from './Evolve.ts'
export * from './ExpectedCommand.ts'
export { CommentsAreUnavailable, type PublishedCommentWithAuthor } from './GetPublishedCommentsForAPrereview/index.ts'
export * from './State.ts'

export const makeHandleCommentCommand: Effect.Effect<
  typeof HandleCommentCommand.Service,
  never,
  EventStore.EventStore
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return Effect.fn('Comments.handleCommentCommand')(
    function* (command) {
      const { events, lastKnownPosition } = yield* pipe(
        EventStore.query({
          types: CommentEventTypes,
          predicates: { commentId: command.commentId },
        }),
        Effect.map(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
      )

      const state = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
        EvolveComment(state)(event),
      )

      yield* pipe(
        Effect.fromResult(DecideComment(state)(command)),
        Effect.tap(
          Option.match({
            onNone: () => Effect.void,
            onSome: event =>
              EventStore.appendIf(event, {
                filter: {
                  types: CommentEventTypes,
                  predicates: { commentId: command.commentId },
                },
                lastKnownPosition: Option.fromNullishOr(lastKnownPosition),
              }),
          }),
        ),
      )
    },
    Effect.catchTag(
      ['FailedToCommitEvent', 'FailedToGetEvents', 'NewEventsFound'],
      cause => new Commands.UnableToHandleCommand({ cause }),
    ),
    Effect.provide(context),
  )
})

export const makeGetComment: Effect.Effect<typeof GetComment.Service, never, EventStore.EventStore> = Effect.gen(
  function* () {
    const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    return Effect.fn('Comments.getComment')(
      function* (commentId) {
        const events = yield* pipe(
          EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
          Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
          EvolveComment(state)(event),
        )
      },
      Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
      Effect.provide(context),
    )
  },
)

export const makeGetNextExpectedCommandForUser: Effect.Effect<
  typeof GetNextExpectedCommandForUser.Service,
  never,
  EventStore.EventStore
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return Effect.fn('Comments.getNextExpectedCommandForUser')(
    function* ({ authorId, prereviewId }) {
      const events = yield* pipe(
        EventStore.query({ types: CommentEventTypes }),
        Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      )

      return CommentQueries.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })
    },
    Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
    Effect.provide(context),
  )
})

export const makeGetNextExpectedCommandForUserOnAComment: Effect.Effect<
  typeof GetNextExpectedCommandForUserOnAComment.Service,
  never,
  EventStore.EventStore
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return Effect.fn('Comments.getNextExpectedCommandForUserOnAComment')(
    function* (commentId) {
      const events = yield* pipe(
        EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
        Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      )

      return CommentQueries.GetNextExpectedCommandForUserOnAComment(events)(commentId)
    },
    Effect.catchTag('FailedToGetEvents', cause => new Queries.UnableToQuery({ cause })),
    Effect.provide(context),
  )
})

export const layer = Layer.mergeAll(
  commentsServiceLayer,
  Layer.effect(HandleCommentCommand, makeHandleCommentCommand),
  Layer.effect(GetNextExpectedCommandForUser, makeGetNextExpectedCommandForUser),
  Layer.effect(GetNextExpectedCommandForUserOnAComment, makeGetNextExpectedCommandForUserOnAComment),
  Layer.effect(GetComment, makeGetComment),
)

const ReactToCommentEventsNoDeps: Layer.Layer<
  never,
  never,
  | EventStore.EventStore
  | GetComment
  | HandleCommentCommand
  | ContactEmailAddresses
  | CreateRecordOnZenodoForComment
  | PublishCommentOnZenodo
  | Sharding.Sharding
  | WorkflowEngine.WorkflowEngine
> = EventSubscription.make('Comments/Reactions', {
  CommentWasStarted: ({ commentId }) =>
    Workflows.CheckIfUserHasAVerifiedEmailAddress.execute({ commentId }, { discard: true }),
  PublicationOfCommentWasRequested: ({ commentId }) =>
    Workflows.AssignCommentADoi.execute({ commentId }, { discard: true }),
  CommentWasAssignedADoi: ({ commentId, id }) => Workflows.PublishComment.execute({ commentId, id }, { discard: true }),
}).pipe(Layer.merge(Workflows.workflowsLayer))

export const ReactToCommentEvents = Layer.provide(ReactToCommentEventsNoDeps, layerZenodo)
