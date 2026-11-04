import { Array, Context, Effect, Layer, Match, Option, pipe, PubSub, Schedule, Scope, Struct, flow } from 'effect'
import { type Sharding, Singleton } from 'effect/cluster'
import type { ContactEmailAddresses } from '../ContactEmailAddresses/index.ts'
import * as Events from '../Events.ts'
import * as EventStore from '../EventStore.ts'
import { UnableToQuery } from '../Queries.ts'
import * as ReviewPage from '../WebApp/review-page/index.ts'
import {
  GetComment,
  GetNextExpectedCommandForUser,
  GetNextExpectedCommandForUserOnAComment,
  HandleCommentCommand,
  UnableToHandleCommand,
  type CreateRecordOnZenodoForComment,
  type PublishCommentOnZenodo,
} from './Context.ts'
import { DecideComment } from './Decide.ts'
import { CommentEventTypes, type CommentEvent } from './Events.ts'
import { EvolveComment } from './Evolve.ts'
import * as Queries from './Queries.ts'
import * as React from './React.ts'
import { CommentNotStarted, type CommentState } from './State.ts'
import { layerZenodo } from './Zenodo.ts'

export * from './Commands.ts'
export * from './Context.ts'
export * from './Decide.ts'
export * from './Errors.ts'
export * from './Events.ts'
export * from './Evolve.ts'
export * from './ExpectedCommand.ts'
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
      cause => new UnableToHandleCommand({ cause }),
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
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
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

      return Queries.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })
    },
    Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
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

      return Queries.GetNextExpectedCommandForUserOnAComment(events)(commentId)
    },
    Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
    Effect.provide(context),
  )
})

export const layer = Layer.mergeAll(
  Layer.effect(HandleCommentCommand, makeHandleCommentCommand),
  Layer.effect(GetNextExpectedCommandForUser, makeGetNextExpectedCommandForUser),
  Layer.effect(GetNextExpectedCommandForUserOnAComment, makeGetNextExpectedCommandForUserOnAComment),
  Layer.effect(GetComment, makeGetComment),
)

const AssignADoiToCommentsInNeedOfOne = Singleton.make(
  'Comments/AssignADoiToCommentsInNeedOfOne',
  pipe(
    EventStore.query({ types: ['PublicationOfCommentWasRequested', 'CommentWasAssignedADoi'] }),
    Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
    Effect.andThen(events => Effect.fromResult(Queries.GetACommentInNeedOfADoi(events))),
    Effect.bindTo('commentId'),
    Effect.bind('inputForCommentZenodoRecord', ({ commentId }) =>
      pipe(
        EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
        Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        Effect.andThen(flow(Queries.buildInputForCommentZenodoRecord, Effect.fromResult)),
      ),
    ),
    Effect.andThen(React.AssignCommentADoiWhenPublicationWasRequested),
    Effect.catchTag('NoCommentsInNeedOfADoi', () => Effect.void),
    Effect.catch(error => Effect.annotateLogs(Effect.logError('AssignADoiToCommentsInNeedOfOne failed'), { error })),
    Effect.repeat(Schedule.fixed('1 minute')),
  ),
)

const ReactToCommentEventsNoDeps: Layer.Layer<
  never,
  never,
  | Events.Events
  | EventStore.EventStore
  | GetComment
  | HandleCommentCommand
  | ContactEmailAddresses
  | CreateRecordOnZenodoForComment
  | PublishCommentOnZenodo
  | ReviewPage.CommentsForReview
  | Sharding.Sharding
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const events = yield* Events.Events
    const dequeue = yield* PubSub.subscribe(events)

    return yield* pipe(
      PubSub.take(dequeue),
      Effect.filterOrElse(Events.isCommentEvent, () => Effect.fail('not a comment event')),
      Effect.tap(({ commentId }) => Effect.annotateLogsScoped({ commentId })),
      Effect.andThen(
        pipe(
          Match.type<CommentEvent>(),
          Match.tag('CommentWasStarted', ({ commentId }) => React.CheckIfUserHasAVerifiedEmailAddress(commentId)),
          Match.tag('PublicationOfCommentWasRequested', ({ commentId }) =>
            pipe(
              EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
              Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
              Effect.andThen(flow(Queries.buildInputForCommentZenodoRecord, Effect.fromResult)),
              Effect.andThen(inputForCommentZenodoRecord =>
                React.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
              ),
            ),
          ),
          Match.tag('CommentWasAssignedADoi', React.PublishCommentWhenCommentWasAssignedADoi),
          Match.tag('CommentWasPublished', ({ commentId }) =>
            pipe(
              EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
              Effect.flatMap(Effect.fromOption),
              Effect.andThen(eventsForComment => Effect.fromOption(Queries.GetPrereviewId(eventsForComment.events))),
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
      Effect.catchIf(
        error => error === 'not a comment event',
        () => Effect.void,
      ),
      Effect.catch(error => Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { error })),
      Effect.scoped,
      Effect.forever,
    )
  }),
).pipe(Layer.merge(AssignADoiToCommentsInNeedOfOne))

export const ReactToCommentEvents = Layer.provide(ReactToCommentEventsNoDeps, layerZenodo)
