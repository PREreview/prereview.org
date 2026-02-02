import { Array, Context, Effect, Layer, Match, Option, pipe, PubSub, Queue, Schedule, Scope, Struct } from 'effect'
import * as Events from '../Events.ts'
import * as EventStore from '../EventStore.ts'
import { UnableToQuery } from '../Queries.ts'
import * as ReviewPage from '../WebApp/review-page/index.ts' // eslint-disable-line import/no-internal-modules
import {
  UnableToHandleCommand,
  type CreateRecordOnZenodoForComment,
  type DoesUserHaveAVerifiedEmailAddress,
  type GetComment,
  type GetNextExpectedCommandForUser,
  type GetNextExpectedCommandForUserOnAComment,
  type HandleCommentCommand,
  type PublishCommentOnZenodo,
} from './Context.ts'
import { DecideComment } from './Decide.ts'
import { CommentEventTypes, type CommentEvent } from './Events.ts'
import { EvolveComment } from './Evolve.ts'
import * as Queries from './Queries.ts'
import * as React from './React.ts'
import { CommentNotStarted, type CommentState } from './State.ts'

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
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return command =>
    Effect.gen(function* () {
      const { events, lastKnownEvent } = yield* pipe(
        EventStore.query({
          types: CommentEventTypes,
          predicates: { commentId: command.commentId },
        }),
        Effect.andThen(Option.getOrElse(() => ({ events: [], lastKnownEvent: undefined }))),
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
              EventStore.append(event, {
                filter: {
                  types: CommentEventTypes,
                  predicates: { commentId: command.commentId },
                },
                lastKnownEvent: Option.fromNullable(lastKnownEvent),
              }),
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
      Effect.provide(context),
    )
})

export const makeGetComment: Effect.Effect<typeof GetComment.Service, never, EventStore.EventStore> = Effect.gen(
  function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    return commentId =>
      Effect.gen(function* () {
        const events = yield* pipe(
          EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
          Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
          EvolveComment(state)(event),
        )
      }).pipe(
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
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return ({ authorId, prereviewId }) =>
    Effect.gen(function* () {
      const events = yield* pipe(
        EventStore.query({ types: CommentEventTypes }),
        Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      )

      return Queries.GetNextExpectedCommandForUser(events)({ authorId, prereviewId })
    }).pipe(
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      Effect.provide(context),
    )
})

export const makeGetNextExpectedCommandForUserOnAComment: Effect.Effect<
  typeof GetNextExpectedCommandForUserOnAComment.Service,
  never,
  EventStore.EventStore
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return commentId =>
    Effect.gen(function* () {
      const events = yield* pipe(
        EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
        Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      )

      return Queries.GetNextExpectedCommandForUserOnAComment(events)(commentId)
    }).pipe(
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      Effect.provide(context),
    )
})

export const ReactToCommentEvents: Layer.Layer<
  never,
  never,
  | Events.Events
  | EventStore.EventStore
  | GetComment
  | HandleCommentCommand
  | DoesUserHaveAVerifiedEmailAddress
  | CreateRecordOnZenodoForComment
  | PublishCommentOnZenodo
  | ReviewPage.CommentsForReview
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const events = yield* Events.Events
    const dequeue = yield* PubSub.subscribe(events)

    yield* pipe(
      EventStore.query({ types: ['PublicationOfCommentWasRequested', 'CommentWasAssignedADoi'] }),
      Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
      Effect.andThen(events => Queries.GetACommentInNeedOfADoi(events)),
      Effect.bindTo('commentId'),
      Effect.bind('inputForCommentZenodoRecord', ({ commentId }) =>
        pipe(
          EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
          Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
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
      Effect.filterOrElse(Events.isCommentEvent, () => Effect.fail('not a comment event')),
      Effect.tap(({ commentId }) => Effect.annotateLogsScoped({ commentId })),
      Effect.andThen(
        pipe(
          Match.type<CommentEvent>(),
          Match.tag('CommentWasStarted', ({ commentId }) => React.CheckIfUserHasAVerifiedEmailAddress(commentId)),
          Match.tag('PublicationOfCommentWasRequested', ({ commentId }) =>
            pipe(
              EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
              Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
              Effect.andThen(Queries.buildInputForCommentZenodoRecord),
              Effect.andThen(inputForCommentZenodoRecord =>
                React.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
              ),
            ),
          ),
          Match.tag('CommentWasAssignedADoi', React.PublishCommentWhenCommentWasAssignedADoi),
          Match.tag('CommentWasPublished', ({ commentId }) =>
            pipe(
              EventStore.query({ types: CommentEventTypes, predicates: { commentId } }),
              Effect.flatten,
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
      Effect.catchIf(
        error => error === 'not a comment event',
        () => Effect.void,
      ),
      Effect.catchAll(error => Effect.annotateLogs(Effect.logError('ReactToCommentEvents failed'), { error })),
      Effect.scoped,
      Effect.forever,
    )
  }),
)
