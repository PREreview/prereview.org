import { Effect, Layer, Option, pipe, Result, Schema, Tracer } from 'effect'
import * as Events from '../../src/Domain/Events/Events.ts'
import * as EventStore from '../../src/Domain/Events/EventStore.ts'
import * as StatefulQueries from '../../src/Domain/Events/StatefulQueries.ts'
import * as _ from '../../src/EventSourcing/Queries.ts'
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

describe('makeOnDemandQuery', () => {
  const query = <I>(inputSchema?: Schema.Codec<I, unknown>) =>
    _.OnDemandQuery<Events.Event, [I], string>({
      name: 'Test.onDemandQuery',
      ...(inputSchema === undefined ? {} : { inputSchema }),
      createFilter: (_input: I) => Events.EventFilter({ types: ['PreprintReviewImported'] }),
      query: () => Result.succeed('result'),
    })

  const run = <I>(definition: _.OnDemandQuery<Events.Event, [I], string>, input: I) => {
    const { spans, tracer } = recordSpans()

    return pipe(
      _.makeOnDemandQuery(EventStore.EventStore, definition),
      Effect.flatMap(query => query(input)),
      Effect.provide(Layer.mock(EventStore.EventStore, { query: () => Effect.succeed(Option.none()) })),
      Effect.withTracer(tracer),
      Effect.as(spans),
    )
  }

  it.effect('records each field of the encoded input on the span', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Input), { id: 123, tags: ['a', 'b'], flag: true })

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({
        'input.id': '123',
        'input.tags': ['a', 'b'],
        'input.flag': true,
      })
    }),
  )

  it.effect('leaves out fields without a value', () =>
    Effect.gen(function* () {
      const spans = yield* run(
        query(Schema.Struct({ id: Schema.NumberFromString, tag: Schema.optional(Schema.String) })),
        { id: 123, tag: undefined },
      )

      expect(Object.keys(attributesOf(spans, 'Test.onDemandQuery'))).toStrictEqual(['input.id'])
    }),
  )

  it.effect('records a single encoded value on the span', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Schema.NumberFromString), 123)

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({ input: '123' })
    }),
  )

  it.effect('records bigints as strings', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Schema.Struct({ id: Schema.BigInt, ids: Schema.Array(Schema.BigInt) })), {
        id: 1n,
        ids: [2n, 3n],
      })

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({ 'input.id': '1', 'input.ids': ['2', '3'] })
    }),
  )

  it.effect('records a single bigint as a string', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Schema.BigInt), 1n)

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({ input: '1' })
    }),
  )

  it.effect('records an array as a single value', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Schema.Array(Schema.String)), ['a', 'b'])

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({ input: ['a', 'b'] })
    }),
  )

  it.effect('records a nested object as it is', () =>
    Effect.gen(function* () {
      const spans = yield* run(
        query(Schema.Struct({ author: Schema.Struct({ id: Schema.NumberFromString, name: Schema.String }) })),
        { author: { id: 123, name: 'Josiah Carberry' } },
      )

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({
        'input.author': { id: '123', name: 'Josiah Carberry' },
      })
    }),
  )

  it.effect('records nothing without a schema', () =>
    Effect.gen(function* () {
      const spans = yield* run(query<number>(), 123)

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({})
    }),
  )
})

describe('makeStatefulQuery', () => {
  it.effect('records the encoded input on the span', () =>
    Effect.gen(function* () {
      const { spans, tracer } = recordSpans()

      const definition = _.StatefulQuery({
        name: 'Test.statefulQuery',
        inputSchema: Input,
        initialState: undefined,
        updateStateWithEvents: state => state,
        query: (_state, _input: typeof Input.Type) => Result.succeed('result'),
      })

      yield* pipe(
        _.makeStatefulQuery(StatefulQueries.StatefulQueries, definition),
        Effect.flatMap(query => query({ id: 123, tags: [], flag: false })),
        Effect.provide(Layer.mock(StatefulQueries.StatefulQueries, { register: () => Effect.void })),
        Effect.withTracer(tracer),
      )

      expect(attributesOf(spans, 'Test.statefulQuery')).toStrictEqual({
        'input.id': '123',
        'input.tags': [],
        'input.flag': false,
      })
    }),
  )

  it.effect('fails its queries once updating its state has failed', () =>
    Effect.gen(function* () {
      const subscribers: Array<Parameters<(typeof StatefulQueries.StatefulQueries.Service)['register']>[0]> = []

      const query = yield* pipe(
        _.makeStatefulQuery(
          StatefulQueries.StatefulQueries,
          _.StatefulQuery({
            name: 'Test.statefulQuery',
            initialState: 0,
            updateStateWithEvents: () => {
              throw new Error('unable to update')
            },
            query: (state: number) => Result.succeed(state),
          }),
        ),
        Effect.provide(
          Layer.mock(StatefulQueries.StatefulQueries, {
            register: subscriber => Effect.sync(() => subscribers.push(subscriber)),
          }),
        ),
      )

      yield* Effect.exit(Effect.forEach(subscribers, subscriber => subscriber([event])))

      const actual = yield* Effect.result(query())

      expect(actual).toStrictEqual(Result.fail(new _.UnableToQuery({ cause: new Error('unable to update') })))
    }),
  )

  it.effect('records updating its state on a span', () =>
    Effect.gen(function* () {
      const { spans, tracer } = recordSpans()
      const subscribers: Array<Parameters<(typeof StatefulQueries.StatefulQueries.Service)['register']>[0]> = []

      yield* pipe(
        _.makeStatefulQuery(
          StatefulQueries.StatefulQueries,
          _.StatefulQuery({
            name: 'Test.statefulQuery',
            initialState: 0,
            updateStateWithEvents: (state, events) => state + events.length,
            query: (state: number) => Result.succeed(state),
          }),
        ),
        Effect.provide(
          Layer.mock(StatefulQueries.StatefulQueries, {
            register: subscriber => Effect.sync(() => subscribers.push(subscriber)),
          }),
        ),
      )

      yield* pipe(
        Effect.forEach(subscribers, subscriber => subscriber([event, event, event])),
        Effect.withTracer(tracer),
      )

      expect(
        spans.find(span => span.name === 'Test.statefulQuery.updateStateWithEvents')?.attributes.get('eventCount'),
      ).toBe(3)
    }),
  )
})
