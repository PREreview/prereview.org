import { Context, Data, Effect, Option, pipe, Scope, type Either, type Types } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromCommand<T extends Command<any, any, any, any>> = [T] extends [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Command<any, infer Input, any, infer Error>,
]
  ? (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>
  : never

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export interface Command<
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
> {
  name: string
  createFilter: (...input: Input) => Events.EventFilter<EventTags>
  foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
  decide: (state: State, ...input: Input) => Either.Either<Option.Option<Events.Event>, Error>
}

export const Command: <EventTags extends Types.Tags<Events.Event>, Input extends ReadonlyArray<unknown>, State, Error>(
  command: Command<EventTags, Input, State, Error>,
) => Command<EventTags, Input, State, Error> = Data.struct

export const makeCommand = <
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
>({
  name,
  createFilter,
  foldState,
  decide,
}: Command<EventTags, Input, State, Error>): Effect.Effect<
  (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    return Effect.fn(name)(
      function* (...input: Input) {
        const filter = createFilter(...input)

        const { events, lastKnownPosition } = yield* pipe(
          EventStore.query(filter),
          Effect.andThen(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
        )

        const state = foldState(events, ...input)

        const decision = yield* decide(state, ...input)

        yield* Option.match(decision, {
          onNone: () => Effect.void,
          onSome: event =>
            EventStore.append(event, { filter, lastKnownPosition: Option.fromNullable(lastKnownPosition) }),
        })
      },
      Effect.catchTag(
        'FailedToCommitEvent',
        'FailedToGetEvents',
        'NewEventsFound',
        cause => new UnableToHandleCommand({ cause }),
      ),
      Effect.provide(context),
    )
  })
