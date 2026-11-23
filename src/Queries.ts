import {
  Array,
  Data,
  Effect,
  Filter,
  flow,
  identity,
  Option,
  pipe,
  Predicate,
  Record,
  Ref,
  Result,
  Schema,
  Struct,
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
export type FromOnDemandQuery<T extends OnDemandQuery<any, any, any>> = [T] extends [
  OnDemandQuery<infer Input, infer Result, infer Error>,
]
  ? (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>
  : never

// oxlint-disable-next-line typescript/no-explicit-any
export type FromStatefulQuery<T extends StatefulQuery<any, any, any, any>> = [T] extends [
  // oxlint-disable-next-line typescript/no-explicit-any
  StatefulQuery<infer Input, infer Result, infer Error, any>,
]
  ? (...input: Input) => Effect.Effect<Result, Error>
  : never

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

type QueryInput = readonly [] | readonly [input: unknown]

type InputSchema<Input extends QueryInput> = Input extends readonly [infer I] ? Schema.Codec<I, unknown> : never

export interface OnDemandQuery<Input extends QueryInput, Result, Error = never> {
  name: string
  inputSchema?: InputSchema<Input>
  createFilter: (...input: Input) => Events.EventFilter
  query: (
    events: ReadonlyArray<Events.Event>,
    ...input: Input
  ) => Result.Result<Result, Error | UnexpectedSequenceOfEvents>
}

export interface StatefulQuery<Input extends QueryInput, Result, Error = never, State = unknown> {
  name: string
  inputSchema?: InputSchema<Input>
  initialState: State
  updateStateWithEvents: (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>) => State
  query: (state: State, ...input: Input) => Result.Result<Result, Error>
}

export const OnDemandQuery: <Input extends QueryInput, Result, Error = never>(
  query: OnDemandQuery<Input, Result, Error>,
) => OnDemandQuery<Input, Result, Error> = identity

export const StatefulQuery: <Input extends QueryInput, Result, Error = never, State = unknown>(
  query: StatefulQuery<Input, Result, Error, State>,
) => StatefulQuery<Input, Result, Error, State> = identity

export const makeOnDemandQuery = <Input extends QueryInput, Result, Error = never>({
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

export const makeStatefulQuery = <Input extends QueryInput, Result, Error = never, State = unknown>({
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

  return pipe(
    encoded,
    Record.filterMap(
      pipe(Filter.fromPredicate(Predicate.isNotUndefined), Filter.compose(flow(toAttributeValue, Result.succeed))),
    ),
    Record.mapKeys(key => `input.${key}`),
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
