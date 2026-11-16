import { describe, expect, it } from './vitest.ts'
import { Effect, Layer, Option, pipe, Result, Schema, Tracer } from 'effect'
import * as EventDispatcher from '../src/EventDispatcher.ts'
import * as Events from '../src/Events.ts'
import * as EventStore from '../src/EventStore.ts'
import * as _ from '../src/Queries.ts'

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

const Input = Schema.Struct({
  id: Schema.NumberFromString,
  tags: Schema.Array(Schema.String),
  flag: Schema.Boolean,
})

describe('makeOnDemandQuery', () => {
  const query = <I>(inputSchema?: Schema.Codec<I, unknown>) =>
    _.OnDemandQuery({
      name: 'Test.onDemandQuery',
      ...(inputSchema === undefined ? {} : { inputSchema }),
      createFilter: (_input: I) => Events.EventFilter({ types: ['PreprintReviewImported'] }),
      query: () => Result.succeed('result'),
    })

  const run = <I>(definition: _.OnDemandQuery<[I], string>, input: I) => {
    const { spans, tracer } = recordSpans()

    return pipe(
      _.makeOnDemandQuery(definition),
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
        'input.tags': '["a","b"]',
        'input.flag': true,
      })
    }),
  )

  it.effect('records a single encoded value on the span', () =>
    Effect.gen(function* () {
      const spans = yield* run(query(Schema.NumberFromString), 123)

      expect(attributesOf(spans, 'Test.onDemandQuery')).toStrictEqual({ input: '123' })
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
        _.makeStatefulQuery(definition),
        Effect.flatMap(query => query({ id: 123, tags: [], flag: false })),
        Effect.provide(Layer.mock(EventDispatcher.EventDispatcher, { addSubscriber: () => Effect.void })),
        Effect.withTracer(tracer),
      )

      expect(attributesOf(spans, 'Test.statefulQuery')).toStrictEqual({
        'input.id': '123',
        'input.tags': '[]',
        'input.flag': false,
      })
    }),
  )
})
