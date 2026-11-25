import { Effect, Layer, Option, pipe, Result, Schema, Tracer } from 'effect'
import * as Events from '../../src/Domain/Events/Events.ts'
import * as EventStore from '../../src/Domain/Events/EventStore.ts'
import * as _ from '../../src/EventSourcing/Commands.ts'
import { Temporal, Uuid } from '../../src/types/index.ts'
import { describe, expect, it } from '../vitest.ts'

const recordSpans = () => {
  const spans: Array<Tracer.NativeSpan> = []
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    },
  })

  return { spans, tracer }
}

const attributesOf = (spans: ReadonlyArray<Tracer.NativeSpan>, name: string) =>
  Object.fromEntries(
    Array.from(spans.find(span => span.name === name)?.attributes ?? []).filter(([key]) => key.startsWith('input')),
  )

const event = new Events.ReviewRequestForAPreprintWasAccepted({
  acceptedAt: Temporal.Instant.from('2026-11-10T14:00:00Z'),
  reviewRequestId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
})

const Input = Schema.Struct({
  id: Schema.NumberFromString,
  tags: Schema.Array(Schema.String),
  flag: Schema.Boolean,
})

describe('makeCommand', () => {
  const command = <I>(inputSchema?: Schema.Codec<I, unknown>) =>
    _.Command<Events.Event, [I], undefined, never>({
      name: 'Test.command',
      ...(inputSchema === undefined ? {} : { inputSchema }),
      createFilter: (_input: I) => Events.EventFilter({ types: ['PreprintReviewImported'] }),
      foldState: () => undefined,
      decide: () => Result.succeedNone,
    })

  const run = <I>(definition: _.Command<Events.Event, [I], undefined, never>, input: I) => {
    const { spans, tracer } = recordSpans()

    return pipe(
      _.makeCommand(EventStore.EventStore, definition),
      Effect.flatMap(command => command(input)),
      Effect.provide(Layer.mock(EventStore.EventStore, { query: () => Effect.succeed(Option.none()) })),
      Effect.withTracer(tracer),
      Effect.as(spans),
    )
  }

  it.effect('records each field of the encoded input on the span', () =>
    Effect.gen(function* () {
      const spans = yield* run(command(Input), { id: 123, tags: ['a', 'b'], flag: true })

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({
        'input.id': '123',
        'input.tags': ['a', 'b'],
        'input.flag': true,
      })
    }),
  )

  it.effect('leaves out fields without a value', () =>
    Effect.gen(function* () {
      const spans = yield* run(
        command(Schema.Struct({ id: Schema.NumberFromString, tag: Schema.optional(Schema.String) })),
        { id: 123, tag: undefined },
      )

      expect(Object.keys(attributesOf(spans, 'Test.command'))).toStrictEqual(['input.id'])
    }),
  )

  it.effect('records a single encoded value on the span', () =>
    Effect.gen(function* () {
      const spans = yield* run(command(Schema.NumberFromString), 123)

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({ input: '123' })
    }),
  )

  it.effect('records bigints as strings', () =>
    Effect.gen(function* () {
      const spans = yield* run(command(Schema.Struct({ id: Schema.BigInt, ids: Schema.Array(Schema.BigInt) })), {
        id: 1n,
        ids: [2n, 3n],
      })

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({ 'input.id': '1', 'input.ids': ['2', '3'] })
    }),
  )

  it.effect('records a single bigint as a string', () =>
    Effect.gen(function* () {
      const spans = yield* run(command(Schema.BigInt), 1n)

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({ input: '1' })
    }),
  )

  it.effect('records an array as a single value', () =>
    Effect.gen(function* () {
      const spans = yield* run(command(Schema.Array(Schema.String)), ['a', 'b'])

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({ input: ['a', 'b'] })
    }),
  )

  it.effect('records a nested object as it is', () =>
    Effect.gen(function* () {
      const spans = yield* run(
        command(Schema.Struct({ author: Schema.Struct({ id: Schema.NumberFromString, name: Schema.String }) })),
        { author: { id: 123, name: 'Josiah Carberry' } },
      )

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({
        'input.author': { id: '123', name: 'Josiah Carberry' },
      })
    }),
  )

  it.effect('records nothing without a schema', () =>
    Effect.gen(function* () {
      const spans = yield* run(command<number>(), 123)

      expect(attributesOf(spans, 'Test.command')).toStrictEqual({})
    }),
  )

  it.effect('fails when not authorized', () =>
    Effect.gen(function* () {
      const definition = _.Command<Events.Event, [], undefined, never, true>({
        name: 'Test.command',
        createFilter: () => Events.EventFilter({ types: ['PreprintReviewImported'] }),
        foldState: () => undefined,
        authorize: () => false,
        decide: () => Result.succeedNone,
      })

      const error = yield* pipe(
        _.makeCommand(EventStore.EventStore, definition),
        Effect.flatMap(command => command()),
        Effect.flip,
        Effect.provide(Layer.mock(EventStore.EventStore, { query: () => Effect.succeed(Option.none()) })),
      )

      expect(error).toStrictEqual(new _.UnableToHandleCommand({ cause: 'unauthorized' }))
    }),
  )
})

describe('makeStatelessCommand', () => {
  it.effect('records the encoded input on the span', () =>
    Effect.gen(function* () {
      const { spans, tracer } = recordSpans()

      const definition = _.StatelessCommand<Events.Event, [typeof Input.Type]>({
        name: 'Test.statelessCommand',
        inputSchema: Input,
        decide: (_input: typeof Input.Type) => event,
      })

      yield* pipe(
        _.makeStatelessCommand(EventStore.EventStore, definition),
        Effect.flatMap(command => command({ id: 123, tags: [], flag: false })),
        Effect.provide(Layer.mock(EventStore.EventStore, { append: () => Effect.void })),
        Effect.withTracer(tracer),
      )

      expect(attributesOf(spans, 'Test.statelessCommand')).toStrictEqual({
        'input.id': '123',
        'input.tags': [],
        'input.flag': false,
      })
    }),
  )
})
