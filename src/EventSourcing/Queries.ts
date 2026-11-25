import {
  Array,
  Cause,
  Data,
  Effect,
  identity,
  Option,
  pipe,
  Predicate,
  Record,
  Ref,
  type Result,
  Schema,
  Struct,
} from 'effect'
import type { AnyEvent, EventFilter, EventsForFilter } from './EventFilter.ts'
import type * as EventStore from './EventStore.ts'
import type * as StatefulQueries from './StatefulQueries.ts'

/** @deprecated */
export type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Result.Result<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | Exclude<E | L, UnexpectedSequenceOfEvents>>
  : Effect.Effect<ReturnType<F>, UnableToQuery | Exclude<E, UnexpectedSequenceOfEvents>>

export type FromOnDemandQuery<E extends AnyEvent, T> =
  T extends OnDemandQuery<E, infer Input extends QueryInput, infer Result, infer Error>
    ? (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>
    : never

export type FromStatefulQuery<T> =
  T extends Pick<StatefulQuery<AnyEvent, infer Input extends QueryInput, infer Result, infer Error, never>, 'query'>
    ? (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>
    : never

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export type QueryInput = readonly [] | readonly [input: unknown]

type InputSchema<Input extends QueryInput> = Input extends readonly [infer I] ? Schema.Codec<I, unknown> : never

export interface OnDemandQuery<E extends AnyEvent, Input extends QueryInput, Result, Error = never> {
  name: string
  inputSchema?: InputSchema<Input>
  createFilter: (...input: Input) => EventFilter<E>
  query: (events: ReadonlyArray<E>, ...input: Input) => Result.Result<Result, Error | UnexpectedSequenceOfEvents>
}

export interface StatefulQuery<E extends AnyEvent, Input extends QueryInput, Result, Error = never, State = unknown> {
  name: string
  inputSchema?: InputSchema<Input>
  initialState: State
  updateStateWithEvents: (state: State, events: Array.NonEmptyReadonlyArray<E>) => State
  query: (state: State, ...input: Input) => Result.Result<Result, Error>
}

export const OnDemandQuery: <E extends AnyEvent, Input extends QueryInput, Result, Error = never>(
  query: OnDemandQuery<E, Input, Result, Error>,
) => OnDemandQuery<E, Input, Result, Error> = identity

export const StatefulQuery: <E extends AnyEvent, Input extends QueryInput, Result, Error = never, State = unknown>(
  query: StatefulQuery<E, Input, Result, Error, State>,
) => StatefulQuery<E, Input, Result, Error, State> = identity

export const makeOnDemandQuery = <E extends AnyEvent, R, Input extends QueryInput, Result, Error = never>(
  eventStore: Effect.Effect<EventStore.EventStore<E>, never, R>,
  { name, inputSchema, createFilter, query }: OnDemandQuery<E, Input, Result, Error>,
): Effect.Effect<(...input: Input) => Effect.Effect<Result, UnableToQuery | Error>, never, R> =>
  Effect.gen(function* () {
    const store = yield* eventStore

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

        const filter = createFilter(...input)

        const events = yield* pipe(
          store.query(filter),
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

export const makeStatefulQuery = <
  E extends AnyEvent,
  R,
  Input extends QueryInput,
  Result,
  Error = never,
  State = unknown,
>(
  statefulQueries: Effect.Effect<StatefulQueries.StatefulQueries<E>, never, R>,
  { name, inputSchema, initialState, updateStateWithEvents, query }: StatefulQuery<E, Input, Result, Error, State>,
): Effect.Effect<(...input: Input) => Effect.Effect<Result, Error | UnableToQuery>, never, R> =>
  Effect.gen(function* () {
    const { register } = yield* statefulQueries

    const state = yield* Ref.make(initialState)
    const failure = yield* Ref.make(Option.none<unknown>())

    yield* register(events =>
      pipe(
        Effect.forEach(
          Array.chunksOf(events, 100),
          events => Ref.update(state, currentState => updateStateWithEvents(currentState, events)),
          { discard: true },
        ),
        Effect.onError(cause => Ref.set(failure, Option.some(Cause.squash(cause)))),
        Effect.withSpan(`${name}.updateStateWithEvents`, { attributes: { eventCount: events.length } }),
      ),
    )

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(function* (...input: Input) {
      yield* annotateSpanWithInput(input[0])

      const currentFailure = yield* Ref.get(failure)

      if (Option.isSome(currentFailure)) {
        return yield* new UnableToQuery({ cause: currentFailure.value })
      }

      const currentState = yield* Ref.get(state)

      return yield* Effect.fromResult(query(currentState, ...input))
    })
  })

const makeAnnotateSpanWithInput = <Input>(
  inputSchema: Schema.Codec<Input, unknown> | undefined,
): ((input: Input) => Effect.Effect<void>) => {
  if (inputSchema === undefined) {
    return () => Effect.void
  }

  const encode = Schema.encodeOption(Schema.toCodecJson(inputSchema))

  return input =>
    Option.match(encode(input), {
      onNone: () => Effect.void,
      onSome: encoded => Effect.annotateCurrentSpan(toInputAttributes(encoded)),
    })
}

const toInputAttributes = (encoded: Schema.Json): Record<string, Schema.Json> => {
  if (!isJsonObject(encoded)) {
    return encoded === null ? {} : { input: encoded }
  }

  return pipe(
    encoded,
    Record.filter(Predicate.isNotNull),
    Record.mapKeys(key => `input.${key}`),
  )
}

const isJsonObject: (json: Schema.Json) => json is Schema.JsonObject = Schema.is(Schema.JsonObject)

/** @deprecated */
export const makeQuery = <E extends AnyEvent, R, Filter extends EventFilter<E>, Input, Result, Error>(
  eventStore: Effect.Effect<EventStore.EventStore<E>, never, R>,
  name: string,
  createFilter: (input: Input) => Filter,
  query: (
    events: ReadonlyArray<EventsForFilter<E, Filter>>,
    input: Input,
  ) => Result.Result<Result, UnexpectedSequenceOfEvents | Error>,
): Effect.Effect<(input: Input) => Effect.Effect<Result, UnableToQuery | Error>, never, R> =>
  Effect.gen(function* () {
    const store = yield* eventStore

    return Effect.fn(name)(
      function* (input) {
        const filter = createFilter(input)

        const events = yield* pipe(
          store.query(filter),
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
