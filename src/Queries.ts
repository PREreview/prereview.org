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
import type * as Events from './Events.ts'
import { StatefulQueries } from './EventSourcing/index.ts'
import * as EventStore from './EventStore.ts'

/** @deprecated */
export type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Result.Result<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | Exclude<E | L, UnexpectedSequenceOfEvents>>
  : Effect.Effect<ReturnType<F>, UnableToQuery | Exclude<E, UnexpectedSequenceOfEvents>>

export type FromOnDemandQuery<T> =
  T extends OnDemandQuery<infer Input extends QueryInput, infer Result, infer Error>
    ? (...input: Input) => Effect.Effect<Result, UnableToQuery | Error>
    : never

export type FromStatefulQuery<T> =
  T extends Pick<StatefulQuery<infer Input extends QueryInput, infer Result, infer Error, never>, 'query'>
    ? (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>
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

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

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
  (...input: Input) => Effect.Effect<Result, Error | UnableToQuery>,
  never,
  StatefulQueries.StatefulQueries
> =>
  Effect.gen(function* () {
    const statefulQueries = yield* StatefulQueries.StatefulQueries

    const state = yield* Ref.make(initialState)
    const failure = yield* Ref.make(Option.none<unknown>())

    yield* statefulQueries.register(events =>
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
