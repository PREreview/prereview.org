import { Context, Data, Effect, Layer, Option, pipe, Scope, type Types } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import * as SubscribeToAKeyword from './SubscribeToAKeyword.ts'

export class PrereviewerCommands extends Context.Tag('PrereviewerCommands')<
  PrereviewerCommands,
  {
    subscribeToAKeyword: CommandHandler<SubscribeToAKeyword.Command>
  }
>() {}

type CommandHandler<Command> = (command: Command) => Effect.Effect<void, UnableToHandleCommand>

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export const { subscribeToAKeyword } = Effect.serviceFunctions(PrereviewerCommands)

const makePrereviewerCommands: Effect.Effect<typeof PrereviewerCommands.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleCommand = <Event extends Types.Tags<Events.PrereviewerEvent>, State, Command>(
      createFilter: (command: Command) => Events.EventFilter<Event>,
      foldState: (events: ReadonlyArray<Types.ExtractTag<Events.Event, Event>>, command: Command) => State,
      decide: (command: Command) => (state: State) => Option.Option<Events.PrereviewerEvent>,
    ): CommandHandler<Command> =>
      Effect.fn(
        function* (command) {
          const filter = createFilter(command)

          const { events, lastKnownPosition } = yield* pipe(
            EventStore.query(filter),
            Effect.andThen(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
          )

          yield* pipe(
            Effect.succeed(foldState(events, command)),
            Effect.map(decide(command)),
            Effect.tap(
              Option.match({
                onNone: () => Effect.void,
                onSome: event =>
                  EventStore.append(event, { filter, lastKnownPosition: Option.fromNullable(lastKnownPosition) }),
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
      subscribeToAKeyword: handleCommand(
        SubscribeToAKeyword.createFilter,
        SubscribeToAKeyword.foldState,
        SubscribeToAKeyword.decide,
      ),
    }
  })

export const commandsLayer = Layer.effect(PrereviewerCommands, makePrereviewerCommands)
