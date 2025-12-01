import { Context, Data, Effect, Layer, Option, pipe } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.js'
import type { Uuid } from '../../types/index.ts'
import * as AcceptReviewRequest from './AcceptReviewRequest.js'

export class ReviewRequestCommands extends Context.Tag('ReviewRequestCommands')<
  ReviewRequestCommands,
  {
    acceptReviewRequest: CommandHandler<AcceptReviewRequest.Command>
  }
>() {}

type CommandHandler<Command extends { reviewRequestId: Uuid.Uuid }, Error = never> = (
  command: Command,
) => Effect.Effect<void, UnableToHandleCommand | Error>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const { acceptReviewRequest } = Effect.serviceFunctions(ReviewRequestCommands)

const makeReviewRequestCommands: Effect.Effect<typeof ReviewRequestCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.context<EventStore.EventStore>()

    const handleCommand = <
      Event extends Events.ReviewRequestEvent['_tag'],
      State,
      Command extends { reviewRequestId: Uuid.Uuid },
    >(
      createFilter: (reviewRequestId: Uuid.Uuid) => Events.EventFilter<Event>,
      foldState: (events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>, reviewRequestId: Uuid.Uuid) => State,
      decide: (command: Command) => (state: State) => Option.Option<Events.ReviewRequestEvent>,
    ): CommandHandler<Command> =>
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
      acceptReviewRequest: handleCommand(
        AcceptReviewRequest.createFilter,
        AcceptReviewRequest.foldState,
        AcceptReviewRequest.decide,
      ),
    }
  })

export const commandsLayer = Layer.effect(ReviewRequestCommands, makeReviewRequestCommands)
