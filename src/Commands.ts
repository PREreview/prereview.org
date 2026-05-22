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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromStatelessCommand<T extends StatelessCommand<any>> = [T] extends [StatelessCommand<infer Input>]
  ? (...input: Input) => Effect.Effect<void, UnableToHandleCommand>
  : never

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export type Command<
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
  Authorize extends boolean = false,
> = Authorize extends true
  ? {
      name: string
      createFilter: (...input: Input) => Events.EventFilter<EventTags>
      foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
      authorize: (state: State, ...input: Input) => boolean
      decide: (state: State, ...input: Input) => Either.Either<Option.Option<Events.Event>, Error>
    }
  : {
      name: string
      createFilter: (...input: Input) => Events.EventFilter<EventTags>
      foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
      decide: (state: State, ...input: Input) => Either.Either<Option.Option<Events.Event>, Error>
    }

export interface StatelessCommand<Input extends ReadonlyArray<unknown>> {
  name: string
  decide: (...input: Input) => Events.Event
}

export const Command: <
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
  Authorize extends boolean = false,
>(
  command: Command<EventTags, Input, State, Error, Authorize>,
) => Command<EventTags, Input, State, Error, Authorize> = Data.struct as never

export const StatelessCommand: <Input extends ReadonlyArray<unknown>>(
  command: StatelessCommand<Input>,
) => StatelessCommand<Input> = Data.struct

export const makeCommand = <
  EventTags extends Types.Tags<Events.Event>,
  Input extends ReadonlyArray<unknown>,
  State,
  Error,
  Authorize extends boolean = false,
>(
  command: Command<EventTags, Input, State, Error, Authorize>,
): Effect.Effect<
  (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const { name, createFilter, foldState, decide } = command
    const authorize = 'authorize' in command ? command.authorize : () => true

    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    return Effect.fn(name)(
      function* (...input: Input) {
        const filter = createFilter(...input)

        const { events, lastKnownPosition } = yield* pipe(
          EventStore.query(filter),
          Effect.andThen(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
        )

        const state = foldState(events, ...input)

        if (!authorize(state, ...input)) {
          throw new UnableToHandleCommand({ cause: 'unauthorized' })
        }

        const decision = yield* decide(state, ...input)

        yield* Option.match(decision, {
          onNone: () => Effect.void,
          onSome: event =>
            EventStore.appendIf(event, { filter, lastKnownPosition: Option.fromNullable(lastKnownPosition) }),
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

export const makeStatelessCommand = <Input extends ReadonlyArray<unknown>>({
  name,
  decide,
}: StatelessCommand<Input>): Effect.Effect<
  (...input: Input) => Effect.Effect<void, UnableToHandleCommand>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    return Effect.fn(name)(
      function* (...input: Input) {
        const event = decide(...input)

        yield* EventStore.append(event)
      },
      Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
      Effect.provide(context),
    )
  })
