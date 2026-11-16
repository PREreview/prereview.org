import {
  Array,
  Data,
  Effect,
  identity,
  Option,
  pipe,
  Predicate,
  Record,
  Ref,
  Schema,
  Struct,
  Tuple,
  type Result,
} from 'effect'
import * as EventDispatcher from './EventDispatcher.ts'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

/** @deprecated */
export type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Result.Result<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | Exclude<E | L, UnexpectedSequenceOfEvents>>
  : Effect.Effect<ReturnType<F>, UnableToQuery | Exclude<E, UnexpectedSequenceOfEvents>>

// oxlint-disable-next-line typescript/no-explicit-any
export type FromOnDemandQuery<T extends OnDemandQuery<ReadonlyArray<any>, any, any>> = [T] extends [
  OnDemandQuery<infer Input, infer Result, infer Error>,
]
  ? (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>
  : never

// oxlint-disable-next-line typescript/no-explicit-any
export type FromStatefulQuery<T extends StatefulQuery<ReadonlyArray<any>, any, any, any>> = [T] extends [
  // oxlint-disable-next-line typescript/no-explicit-any
  StatefulQuery<infer Input, infer Result, infer Error, any>,
]
  ? (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>
  : never

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export interface OnDemandQuery<Input extends ReadonlyArray<unknown>, Result, Error = never> {
  name: string
  inputSchema?: Schema.Codec<Input[0], unknown>
  createFilter: (...input: Input) => Events.EventFilter
  query: (
    events: ReadonlyArray<Events.Event>,
    ...input: Input
  ) => Result.Result<Result, Error | UnexpectedSequenceOfEvents>
}

export interface StatefulQuery<Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown> {
  name: string
  inputSchema?: Schema.Codec<Input[0], unknown>
  initialState: State
  updateStateWithEvents: (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>) => State
  query: (state: State, ...input: Input) => Result.Result<Result, Error>
}

export const OnDemandQuery: <Input extends ReadonlyArray<unknown>, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => OnDemandQuery<Input, Result, Error> = identity

export const StatefulQuery: <Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => StatefulQuery<Input, Result, Error, State> = identity

export const makeOnDemandQuery = <Input extends ReadonlyArray<unknown>, Result, Error = never>({
  name,
  inputSchema,
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
        yield* annotateSpanWithInput(inputSchema, input[0])

        const filter = createFilter(...input)

        const events = yield* pipe(
          eventStore.query(filter),
          Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return yield* pipe(
          Effect.suspend(() => Effect.fromResult(query(events, ...input))),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag(['FailedToGetEvents', 'UnexpectedSequenceOfEvents'], cause => new UnableToQuery({ cause })),
    )
  })

export const makeStatefulQuery = <Input extends ReadonlyArray<unknown>, Result, Error = never, State = unknown>({
  name,
  inputSchema,
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
      pipe(
        Effect.forEach(
          Array.chunksOf(events, 100),
          events => Ref.update(state, currentState => updateStateWithEvents(currentState, events)),
          { discard: true },
        ),
        Effect.withSpan(`${name}.updateStateWithEvents`, { attributes: { eventCount: events.length } }),
      ),
    )

    return Effect.fn(name)(function* (...input: Input) {
      yield* annotateSpanWithInput(inputSchema, input[0])

      const currentState = yield* Ref.get(state)

      return yield* Effect.fromResult(query(currentState, ...input))
    })
  })

const annotateSpanWithInput = <Input>(inputSchema: Schema.Codec<Input, unknown> | undefined, input: Input) =>
  Option.match(
    Option.flatMap(Option.fromNullishOr(inputSchema), schema => Schema.encodeOption(schema)(input)),
    {
      onNone: () => Effect.void,
      onSome: encoded => Effect.annotateCurrentSpan(toInputAttributes(encoded)),
    },
  )

const toInputAttributes = (encoded: unknown): Record<string, unknown> => {
  if (!Predicate.isObject(encoded)) {
    return { input: toAttributeValue(encoded) }
  }

  return Record.fromEntries(
    Array.map(Object.entries(encoded), ([key, value]) => Tuple.make(`input.${key}`, toAttributeValue(value))),
  )
}

const toAttributeValue = (value: unknown): unknown =>
  Predicate.isString(value) || Predicate.isNumber(value) || Predicate.isBoolean(value) ? value : JSON.stringify(value)

/** @deprecated */
export const makeQuery = <Filter extends Events.EventFilter, Input, Result, Error>(
  name: string,
  createFilter: (input: Input) => Filter,
  query: (
    events: ReadonlyArray<Events.EventsForFilter<Filter>>,
    input: Input,
  ) => Result.Result<Result, UnexpectedSequenceOfEvents | Error>,
): Effect.Effect<(input: Input) => Effect.Effect<Result, UnableToQuery | Error>, never, EventStore.EventStore> =>
  Effect.gen(function* () {
    const eventStore = yield* EventStore.EventStore

    return Effect.fn(name)(
      function* (input) {
        const filter = createFilter(input)

        const events = yield* pipe(
          eventStore.query(filter),
          Effect.map(Option.match({ onNone: Array.empty, onSome: Struct.get('events') })),
        )

        return yield* pipe(
          Effect.suspend(() => Effect.fromResult(query(events, input))),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag(['FailedToGetEvents', 'UnexpectedSequenceOfEvents'], cause => new UnableToQuery({ cause })),
    )
  })
