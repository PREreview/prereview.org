import { Context, Data, Effect, Either, flow, Layer, Option, pipe, Scope } from 'effect'
import * as Commands from '../../Commands.ts'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import type { Uuid } from '../../types/index.ts'
import * as AcceptReviewRequest from './AcceptReviewRequest.ts'
import * as CategorizeReviewRequest from './CategorizeReviewRequest.ts'
import { ChoosePersona } from './ChoosePersona.ts'
import { PublishReviewRequest } from './PublishReviewRequest.ts'
import * as ReceiveReviewRequest from './ReceiveReviewRequest.ts'
import * as RecordEmailSentToAcknowledgeReviewRequest from './RecordEmailSentToAcknowledgeReviewRequest.ts'
import * as RecordFailureToCategorizeReviewRequest from './RecordFailureToCategorizeReviewRequest.ts'
import * as RecordReviewRequestSharedOnTheCommunitySlack from './RecordReviewRequestSharedOnTheCommunitySlack.ts'
import * as RejectReviewRequest from './RejectReviewRequest.ts'
import { StartReviewRequest } from './StartReviewRequest.ts'
import { WithdrawReviewRequest } from './WithdrawReviewRequest.ts'

export class ReviewRequestCommands extends Context.Tag('ReviewRequestCommands')<
  ReviewRequestCommands,
  {
    startReviewRequest: Commands.FromCommand<typeof StartReviewRequest>
    choosePersona: Commands.FromCommand<typeof ChoosePersona>
    publishReviewRequest: Commands.FromCommand<typeof PublishReviewRequest>
    receiveReviewRequest: CommandHandler<ReceiveReviewRequest.Command>
    acceptReviewRequest: CommandHandler<AcceptReviewRequest.Command, AcceptReviewRequest.Error>
    rejectReviewRequest: CommandHandler<RejectReviewRequest.Command, RejectReviewRequest.Error>
    withdrawReviewRequest: Commands.FromCommand<typeof WithdrawReviewRequest>
    categorizeReviewRequest: CommandHandler<CategorizeReviewRequest.Command, CategorizeReviewRequest.Error>
    recordReviewRequestSharedOnTheCommunitySlack: CommandHandler<
      RecordReviewRequestSharedOnTheCommunitySlack.Command,
      RecordReviewRequestSharedOnTheCommunitySlack.Error
    >
    recordFailureToCategorizeReviewRequest: CommandHandler<RecordFailureToCategorizeReviewRequest.Command>
    recordEmailSentToAcknowledgeReviewRequest: CommandHandler<RecordEmailSentToAcknowledgeReviewRequest.Command>
  }
>() {}

type CommandHandler<Command extends { reviewRequestId: Uuid.Uuid }, Error = never> = (
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const startReviewRequest = (...args: Parameters<(typeof ReviewRequestCommands.Service)['startReviewRequest']>) =>
  Effect.flatMap(ReviewRequestCommands, service => service.startReviewRequest(...args))

export const choosePersona = (...args: Parameters<(typeof ReviewRequestCommands.Service)['choosePersona']>) =>
  Effect.flatMap(ReviewRequestCommands, service => service.choosePersona(...args))

export const publishReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['publishReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.publishReviewRequest(...args))

export const receiveReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['receiveReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.receiveReviewRequest(...args))

export const acceptReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['acceptReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.acceptReviewRequest(...args))

export const rejectReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['rejectReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.rejectReviewRequest(...args))

export const withdrawReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['withdrawReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.withdrawReviewRequest(...args))

export const categorizeReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['categorizeReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.categorizeReviewRequest(...args))

export const recordReviewRequestSharedOnTheCommunitySlack = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['recordReviewRequestSharedOnTheCommunitySlack']>
) => Effect.flatMap(ReviewRequestCommands, service => service.recordReviewRequestSharedOnTheCommunitySlack(...args))

export const recordFailureToCategorizeReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['recordFailureToCategorizeReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.recordFailureToCategorizeReviewRequest(...args))

export const recordEmailSentToAcknowledgeReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestCommands.Service)['recordEmailSentToAcknowledgeReviewRequest']>
) => Effect.flatMap(ReviewRequestCommands, service => service.recordEmailSentToAcknowledgeReviewRequest(...args))

const makeReviewRequestCommands: Effect.Effect<typeof ReviewRequestCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleCommand = <
      Filter extends Events.EventFilter,
      State,
      Command extends { reviewRequestId: Uuid.Uuid },
      Error,
    >(
      createFilter: (reviewRequestId: Uuid.Uuid) => Filter,
      foldState: (events: ReadonlyArray<Events.EventsForFilter<Filter>>, reviewRequestId: Uuid.Uuid) => State,
      decide: (
        command: Command,
      ) => (
        state: State,
      ) => Option.Option<Events.ReviewRequestEvent> | Either.Either<Option.Option<Events.ReviewRequestEvent>, Error>,
    ): CommandHandler<Command, Error> =>
      Effect.fn(
        function* (command) {
          const filter = createFilter(command.reviewRequestId)

          const { events, lastKnownPosition } = yield* pipe(
            EventStore.query(filter),
            Effect.map(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
          )

          yield* pipe(
            Effect.succeed(foldState(events, command.reviewRequestId)),
            Effect.map(decide(command)),
            Effect.andThen(decision => (Either.isEither(decision) ? decision : Either.right(decision))),
            Effect.tap(
              Option.match({
                onNone: () => Effect.void,
                onSome: event =>
                  EventStore.appendIf(event, { filter, lastKnownPosition: Option.fromNullable(lastKnownPosition) }),
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
      startReviewRequest: yield* Commands.makeCommand(StartReviewRequest),
      choosePersona: yield* Commands.makeCommand(ChoosePersona),
      publishReviewRequest: yield* Commands.makeCommand(PublishReviewRequest),
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
      withdrawReviewRequest: yield* Commands.makeCommand(WithdrawReviewRequest),
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
          Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
          Effect.provide(context),
        ),
      recordEmailSentToAcknowledgeReviewRequest: flow(
        RecordEmailSentToAcknowledgeReviewRequest.decide,
        EventStore.append,
        Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
        Effect.provide(context),
      ),
    }
  })

export const commandsLayer = Layer.effect(ReviewRequestCommands, makeReviewRequestCommands)
