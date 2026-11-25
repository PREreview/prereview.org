import { Data, Effect, identity, Option, pipe, Predicate, Record, type Result, Schema } from 'effect'
import type { AnyEvent, EventFilter } from './EventFilter.ts'
import type * as EventStore from './EventStore.ts'

export type FromCommand<E extends AnyEvent, T> =
  T extends Pick<Command<E, infer Input extends CommandInput, never, infer Error>, 'decide'>
    ? (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>
    : never

export type FromStatelessCommand<E extends AnyEvent, T> =
  T extends StatelessCommand<E, infer Input extends CommandInput>
    ? (...input: Input) => Effect.Effect<void, UnableToHandleCommand>
    : never

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

export type CommandInput = readonly [] | readonly [input: unknown]

type InputSchema<Input extends CommandInput> = Input extends readonly [infer I] ? Schema.Codec<I, unknown> : never

export type Command<
  E extends AnyEvent,
  Input extends CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
> = Authorize extends true
  ? {
      name: string
      inputSchema?: InputSchema<Input>
      createFilter: (...input: Input) => EventFilter<E>
      foldState: (events: ReadonlyArray<E>, ...input: Input) => State
      authorize: (state: State, ...input: Input) => boolean
      decide: (state: State, ...input: Input) => Result.Result<Option.Option<E>, Error>
    }
  : {
      name: string
      inputSchema?: InputSchema<Input>
      createFilter: (...input: Input) => EventFilter<E>
      foldState: (events: ReadonlyArray<E>, ...input: Input) => State
      decide: (state: State, ...input: Input) => Result.Result<Option.Option<E>, Error>
    }

export interface StatelessCommand<E extends AnyEvent, Input extends CommandInput> {
  name: string
  inputSchema?: InputSchema<Input>
  decide: (...input: Input) => E
}

export const Command: <E extends AnyEvent, Input extends CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<E, Input, State, Error, Authorize>,
) => Command<E, Input, State, Error, Authorize> = identity

export const StatelessCommand: <E extends AnyEvent, Input extends CommandInput>(
  command: StatelessCommand<E, Input>,
) => StatelessCommand<E, Input> = identity

export const makeCommand = <
  E extends AnyEvent,
  R,
  Input extends CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
>(
  eventStore: Effect.Effect<EventStore.EventStore<E>, never, R>,
  command: Command<E, Input, State, Error, Authorize>,
): Effect.Effect<(...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>, never, R> =>
  Effect.gen(function* () {
    const { name, inputSchema, createFilter, foldState, decide } = command
    const authorize = 'authorize' in command ? command.authorize : () => true

    const store = yield* eventStore

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

        const filter = createFilter(...input)

        const { events, lastKnownPosition } = yield* pipe(
          store.query(filter),
          Effect.map(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
        )

        const state = foldState(events, ...input)

        if (!authorize(state, ...input)) {
          return yield* new UnableToHandleCommand({ cause: 'unauthorized' })
        }

        const decision = yield* Effect.fromResult(decide(state, ...input))

        yield* Option.match(decision, {
          onNone: () => Effect.void,
          onSome: event =>
            store.appendIf(event, { filter, lastKnownPosition: Option.fromNullishOr(lastKnownPosition) }),
        })
      },
      Effect.catchTag(
        ['FailedToCommitEvent', 'FailedToGetEvents', 'NewEventsFound'],
        cause => new UnableToHandleCommand({ cause }),
      ),
    )
  })

export const makeStatelessCommand = <E extends AnyEvent, R, Input extends CommandInput>(
  eventStore: Effect.Effect<EventStore.EventStore<E>, never, R>,
  { name, inputSchema, decide }: StatelessCommand<E, Input>,
): Effect.Effect<(...input: Input) => Effect.Effect<void, UnableToHandleCommand>, never, R> =>
  Effect.gen(function* () {
    const store = yield* eventStore

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

        const event = decide(...input)

        yield* store.append(event)
      },
      Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
    )
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
