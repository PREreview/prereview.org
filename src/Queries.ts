import { Array, Data, Effect, Option, pipe, Struct, type Either, type Types } from 'effect'
import * as EventDispatcher from './EventDispatcher.ts'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

export type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | L>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

export type SimpleQuery<F> = () => Effect.Effect<F, UnableToQuery>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromStatefulQuery<T extends StatefulQuery<any, ReadonlyArray<any>, any, any>> = [T] extends [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StatefulQuery<any, infer Input, infer Result, infer Error>,
]
  ? (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>
  : never

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export interface StatefulQuery<State, Input extends ReadonlyArray<unknown>, Result, Error> {
  name: string
  initialState: State
  updateStateWithEvent: (state: State, event: Events.Event) => State
  query: (state: State, ...input: Input) => Either.Either<Result, Error>
}

export const StatefulQuery: <State, Input extends ReadonlyArray<unknown>, Result, Error>(
  query: StatefulQuery<State, Input, Result, Error>,
) => StatefulQuery<State, Input, Result, Error> = Data.struct

export const makeStatefulQuery = <State, Input extends ReadonlyArray<unknown>, Result, Error>({
  name,
  initialState,
  updateStateWithEvent,
  query,
}: StatefulQuery<State, Input, Result, Error>): Effect.Effect<
  (...input: Input) => Effect.Effect<Result, Error>,
  never,
  EventDispatcher.EventDispatcher
> =>
  Effect.gen(function* () {
    const eventDispatcher = yield* EventDispatcher.EventDispatcher

    let state = initialState

    yield* eventDispatcher.addSubscriber(event => {
      state = updateStateWithEvent(state, event)
    })

    return Effect.fn(name)(function* (...input: Input) {
      return yield* query(state, ...input)
    })
  })

export const makeQuery = <Event extends Types.Tags<Events.Event>, Input, Result, Error>(
  name: string,
  createFilter: (input: Input) => Events.EventFilter<Event>,
  query: (events: ReadonlyArray<Types.ExtractTag<Events.Event, Event>>, input: Input) => Either.Either<Result, Error>,
): Effect.Effect<(input: Input) => Effect.Effect<Result, UnableToQuery | Error>, never, EventStore.EventStore> =>
  Effect.gen(function* () {
    const eventStore = yield* EventStore.EventStore

    return Effect.fn(name)(
      function* (input) {
        const filter = createFilter(input)

        const events = yield* pipe(
          eventStore.query(filter),
          Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return yield* pipe(
          Effect.suspend(() => query(events, input)),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
    )
  })

export const makeSimpleQuery = <Event extends Types.Tags<Events.ReviewRequestEvent>, Result>(
  name: string,
  filter: Events.EventFilter<Event>,
  query: (events: ReadonlyArray<Types.ExtractTag<Events.Event, Event>>) => Result,
): Effect.Effect<() => Effect.Effect<Result, UnableToQuery>, never, EventStore.EventStore> =>
  Effect.gen(function* () {
    const eventStore = yield* EventStore.EventStore

    return Effect.fn(name)(
      function* () {
        const events = yield* pipe(
          eventStore.query(filter),
          Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return yield* pipe(
          Effect.sync(() => query(events)),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
    )
  })
