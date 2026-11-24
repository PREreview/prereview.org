import { Context, Data, Effect, identity, Option, pipe, Predicate, Record, type Result, Schema, Scope } from 'effect'
import type * as Events from './Events.ts'
import { EventStore } from './EventSourcing/index.ts'

export type FromCommand<T> =
  T extends Pick<Command<infer Input extends CommandInput, never, infer Error>, 'decide'>
    ? (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>
    : never

export type FromStatelessCommand<T> =
  T extends StatelessCommand<infer Input extends CommandInput>
    ? (...input: Input) => Effect.Effect<void, UnableToHandleCommand>
    : never

export class UnableToHandleCommand extends Data.TaggedError('UnableToHandleCommand')<{ cause?: unknown }> {}

type CommandInput = readonly [] | readonly [input: unknown]

type InputSchema<Input extends CommandInput> = Input extends readonly [infer I] ? Schema.Codec<I, unknown> : never

export type Command<
  Input extends CommandInput,
  State,
  Error,
  Authorize extends boolean = false,
> = Authorize extends true
  ? {
      name: string
      inputSchema?: InputSchema<Input>
      createFilter: (...input: Input) => Events.EventFilter
      foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
      authorize: (state: State, ...input: Input) => boolean
      decide: (state: State, ...input: Input) => Result.Result<Option.Option<Events.Event>, Error>
    }
  : {
      name: string
      inputSchema?: InputSchema<Input>
      createFilter: (...input: Input) => Events.EventFilter
      foldState: (events: ReadonlyArray<Events.Event>, ...input: Input) => State
      decide: (state: State, ...input: Input) => Result.Result<Option.Option<Events.Event>, Error>
    }

export interface StatelessCommand<Input extends CommandInput> {
  name: string
  inputSchema?: InputSchema<Input>
  decide: (...input: Input) => Events.Event
}

export const Command: <Input extends CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<Input, State, Error, Authorize>,
) => Command<Input, State, Error, Authorize> = identity

export const StatelessCommand: <Input extends CommandInput>(
  command: StatelessCommand<Input>,
) => StatelessCommand<Input> = identity

export const makeCommand = <Input extends CommandInput, State, Error, Authorize extends boolean = false>(
  command: Command<Input, State, Error, Authorize>,
): Effect.Effect<
  (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const { name, inputSchema, createFilter, foldState, decide } = command
    const authorize = 'authorize' in command ? command.authorize : () => true

    const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

        const filter = createFilter(...input)

        const { events, lastKnownPosition } = yield* pipe(
          EventStore.query(filter),
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
            EventStore.appendIf(event, { filter, lastKnownPosition: Option.fromNullishOr(lastKnownPosition) }),
        })
      },
      Effect.catchTag(
        ['FailedToCommitEvent', 'FailedToGetEvents', 'NewEventsFound'],
        cause => new UnableToHandleCommand({ cause }),
      ),
      Effect.provide(context),
    )
  })

export const makeStatelessCommand = <Input extends CommandInput>({
  name,
  inputSchema,
  decide,
}: StatelessCommand<Input>): Effect.Effect<
  (...input: Input) => Effect.Effect<void, UnableToHandleCommand>,
  never,
  EventStore.EventStore
> =>
  Effect.gen(function* () {
    const context = yield* Effect.map(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const annotateSpanWithInput = makeAnnotateSpanWithInput(inputSchema)

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(input[0])

        const event = decide(...input)

        yield* EventStore.append(event)
      },
      Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
      Effect.provide(context),
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
