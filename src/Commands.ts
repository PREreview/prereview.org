import {
  Context,
  Data,
  Effect,
  Filter,
  flow,
  identity,
  Option,
  pipe,
  Predicate,
  Record,
  Result,
  Schema,
  Scope,
} from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

// oxlint-disable-next-line typescript/no-explicit-any
export type FromCommand<T extends Command<any, any, any>> = [T] extends [Command<infer Input, any, infer Error>]
  ? (...input: Input) => Effect.Effect<void, Error | UnableToHandleCommand>
  : never

// oxlint-disable-next-line typescript/no-explicit-any
export type FromStatelessCommand<T extends StatelessCommand<any>> = [T] extends [StatelessCommand<infer Input>]
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

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(inputSchema, input[0])

        const filter = createFilter(...input)

        const { events, lastKnownPosition } = yield* pipe(
          EventStore.query(filter),
          Effect.map(Option.getOrElse(() => ({ events: [], lastKnownPosition: undefined }))),
        )

        const state = foldState(events, ...input)

        if (!authorize(state, ...input)) {
          throw new UnableToHandleCommand({ cause: 'unauthorized' })
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

    return Effect.fn(name)(
      function* (...input: Input) {
        yield* annotateSpanWithInput(inputSchema, input[0])

        const event = decide(...input)

        yield* EventStore.append(event)
      },
      Effect.catchTag('FailedToCommitEvent', cause => new UnableToHandleCommand({ cause })),
      Effect.provide(context),
    )
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
