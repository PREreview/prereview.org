import { Array, Data, Effect, Option, pipe, Ref, Struct, type Either } from 'effect'
import * as EventDispatcher from './EventDispatcher.ts'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

/** @deprecated */
export type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | L>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

/** @deprecated */
export type SimpleQuery<F> = () => Effect.Effect<F, UnableToQuery>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromOnDemandQuery<T extends OnDemandQuery<ReadonlyArray<any>, any, any>> = [T] extends [
  OnDemandQuery<infer Input, infer Result, infer Error>,
]
  ? (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>
  : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromStatefulQuery<T extends StatefulQuery<ReadonlyArray<any>, any, any, any>> = [T] extends [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  StatefulQuery<infer Input, infer Result, infer Error, any>,
]
  ? (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>
  : never

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export interface OnDemandQuery<Input extends ReadonlyArray<unknown>, Result, Error = never> {
  name: string
  createFilter: (...input: Input) => Events.EventFilter
  query: (
    events: ReadonlyArray<Events.Event>,
    ...input: Input
  ) => Either.Either<Result, Error | UnexpectedSequenceOfEvents>
}

export interface StatefulQuery<Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown> {
  name: string
  initialState: State
  updateStateWithEvents: (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>) => State
  query: (state: State, ...input: Input) => Either.Either<Result, Error>
}

export const OnDemandQuery: <Input extends ReadonlyArray<unknown>, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => OnDemandQuery<Input, Result, Error> = Data.struct

export const StatefulQuery: <Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => StatefulQuery<Input, Result, Error, State> = Data.struct

export const makeOnDemandQuery = <Input extends ReadonlyArray<unknown>, Result, Error = never>({
  name,
  createFilter,
  query,
}: OnDemandQuery<Input, Result, Error>): Effect.Effect<
  (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const eventStore = yield* EventStore.EventStore

    return Effect.fn(name)(
      function* (...input: Input) {
        const filter = createFilter(...input)

        const events = yield* pipe(
          eventStore.query(filter),
          Effect.andThen(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return yield* pipe(
          Effect.suspend(() => query(events, ...input)),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag('FailedToGetEvents', 'UnexpectedSequenceOfEvents', cause => new UnableToQuery({ cause })),
    )
  })

export const makeStatefulQuery = <Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown>({
  name,
  initialState,
  updateStateWithEvents,
  query,
}: StatefulQuery<Input, Result, Error, State>): Effect.Effect<
  (...input: Input) => Effect.Effect<Result, Error>,
  never,
  EventDispatcher.EventDispatcher
> =>
  Effect.gen(function* () {
    const eventDispatcher = yield* EventDispatcher.EventDispatcher

    const state = yield* Ref.make(initialState)

    yield* eventDispatcher.addSubscriber(events =>
      Effect.forEach(
        Array.chunksOf(events, 100),
        events => Ref.update(state, currentState => updateStateWithEvents(currentState, events)),
        { discard: true },
      ),
    )

    return Effect.fn(name)(function* (...input: Input) {
      const currentState = yield* Ref.get(state)

      return yield* query(currentState, ...input)
    })
  })

/** @deprecated */
export const makeQuery = <Filter extends Events.EventFilter, Input, Result, Error>(
  name: string,
  createFilter: (input: Input) => Filter,
  query: (events: ReadonlyArray<Events.EventsForFilter<Filter>>, input: Input) => Either.Either<Result, Error>,
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

/** @deprecated */
export const makeSimpleQuery = <Filter extends Events.EventFilter, Result>(
  name: string,
  filter: Filter,
  query: (events: ReadonlyArray<Events.EventsForFilter<Filter>>) => Result,
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
