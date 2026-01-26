import { Context, Data, Effect, Either, Layer, Option, pipe, Scope } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import type { Uuid } from '../../types/index.ts'
import * as AcceptReviewRequest from './AcceptReviewRequest.ts'
import * as CategorizeReviewRequest from './CategorizeReviewRequest.ts'
import * as ImportReviewRequestFromPreprintServer from './ImportReviewRequestFromPreprintServer.ts'
import * as ImportReviewRequestFromPrereviewer from './ImportReviewRequestFromPrereviewer.ts'
import * as ReceiveReviewRequest from './ReceiveReviewRequest.ts'
import * as RecordFailureToCategorizeReviewRequest from './RecordFailureToCategorizeReviewRequest.ts'
import * as RecordReviewRequestSharedOnTheCommunitySlack from './RecordReviewRequestSharedOnTheCommunitySlack.ts'
import * as RejectReviewRequest from './RejectReviewRequest.ts'

export class ReviewRequestCommands extends Context.Tag('ReviewRequestCommands')<
  ReviewRequestCommands,
  {
    receiveReviewRequest: CommandHandler<ReceiveReviewRequest.Command>
    acceptReviewRequest: CommandHandler<AcceptReviewRequest.Command, AcceptReviewRequest.Error>
    rejectReviewRequest: CommandHandler<RejectReviewRequest.Command, RejectReviewRequest.Error>
    importReviewRequestFromPreprintServer: CommandHandler<ImportReviewRequestFromPreprintServer.Command>
    importReviewRequestFromPrereviewer: CommandHandler<ImportReviewRequestFromPrereviewer.Command>
    categorizeReviewRequest: CommandHandler<CategorizeReviewRequest.Command, CategorizeReviewRequest.Error>
    recordReviewRequestSharedOnTheCommunitySlack: CommandHandler<
      RecordReviewRequestSharedOnTheCommunitySlack.Command,
      RecordReviewRequestSharedOnTheCommunitySlack.Error
    >
    recordFailureToCategorizeReviewRequest: CommandHandler<RecordFailureToCategorizeReviewRequest.Command>
  }
>() {}

type CommandHandler<Command extends { reviewRequestId: Uuid.Uuid }, Error = never> = (
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const {
  receiveReviewRequest,
  acceptReviewRequest,
  rejectReviewRequest,
  importReviewRequestFromPreprintServer,
  importReviewRequestFromPrereviewer,
  categorizeReviewRequest,
  recordReviewRequestSharedOnTheCommunitySlack,
  recordFailureToCategorizeReviewRequest,
} = Effect.serviceFunctions(ReviewRequestCommands)

const makeReviewRequestCommands: Effect.Effect<typeof ReviewRequestCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleCommand = <
      Event extends Events.ReviewRequestEvent['_tag'],
      State,
      Command extends { reviewRequestId: Uuid.Uuid },
      Error,
    >(
      createFilter: (reviewRequestId: Uuid.Uuid) => Events.EventFilter<Event>,
      foldState: (events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>, reviewRequestId: Uuid.Uuid) => State,
      decide: (
        command: Command,
      ) => (
        state: State,
      ) => Option.Option<Events.ReviewRequestEvent> | Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>,
    ): CommandHandler<Command, Error> =>
      Effect.fn(
        function* (command) {
          const filter = createFilter(command.reviewRequestId)

          const { events, lastKnownEvent } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: [], lastKnownEvent: undefined })),
          )

          yield* pipe(
            Effect.succeed(foldState(events, command.reviewRequestId)),
            Effect.map(decide(command)),
            Effect.andThen(decision => (Either.isEither(decision) ? decision : Either.right(decision))),
            Effect.tap(
              Option.match({
                onNone: () => Effect.void,
                onSome: event =>
                  EventStore.append(event, { filter, lastKnownEvent: Option.fromNullable(lastKnownEvent) }),
              }),
            ),
          )
        },
        Effect.catchTag(
          'FailedToCommitEvent',
          'FailedToGetEvents',
          'NewEventsFound',
          cause => new UnableToHandleCommand({ cause }),
        ),
        Effect.provide(context),
      )

    return {
      receiveReviewRequest: handleCommand(
        ReceiveReviewRequest.createFilter,
        ReceiveReviewRequest.foldState,
        ReceiveReviewRequest.decide,
      ),
      acceptReviewRequest: handleCommand(
        AcceptReviewRequest.createFilter,
        AcceptReviewRequest.foldState,
        AcceptReviewRequest.decide,
      ),
      rejectReviewRequest: handleCommand(
        RejectReviewRequest.createFilter,
        RejectReviewRequest.foldState,
        RejectReviewRequest.decide,
      ),
      importReviewRequestFromPreprintServer: handleCommand(
        ImportReviewRequestFromPreprintServer.createFilter,
        ImportReviewRequestFromPreprintServer.foldState,
        ImportReviewRequestFromPreprintServer.decide,
      ),
      importReviewRequestFromPrereviewer: handleCommand(
        ImportReviewRequestFromPrereviewer.createFilter,
        ImportReviewRequestFromPrereviewer.foldState,
        ImportReviewRequestFromPrereviewer.decide,
      ),
      categorizeReviewRequest: handleCommand(
        CategorizeReviewRequest.createFilter,
        CategorizeReviewRequest.foldState,
        CategorizeReviewRequest.decide,
      ),
      recordReviewRequestSharedOnTheCommunitySlack: handleCommand(
        RecordReviewRequestSharedOnTheCommunitySlack.createFilter,
        RecordReviewRequestSharedOnTheCommunitySlack.foldState,
        RecordReviewRequestSharedOnTheCommunitySlack.decide,
      ),
      recordFailureToCategorizeReviewRequest: command =>
        pipe(
          command,
          RecordFailureToCategorizeReviewRequest.decide,
          EventStore.append,
          Effect.catchTag('FailedToCommitEvent', 'NewEventsFound', cause => new UnableToHandleCommand({ cause })),
          Effect.provide(context),
        ),
    }
  })

export const commandsLayer = Layer.effect(ReviewRequestCommands, makeReviewRequestCommands)
