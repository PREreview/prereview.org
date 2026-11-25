import { PgClient } from '@effect/sql-pg'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import {
  Array,
  Deferred,
  Duration,
  Effect,
  Fiber,
  Layer,
  Option,
  pipe,
  Queue,
  Redacted,
  Schema,
  Stream,
  Struct,
} from 'effect'
import { SqlClient } from 'effect/sql'
import { TestClock } from 'effect/testing'
import { sample } from 'fast-check'
import type * as EventFilter from '../../src/EventSourcing/EventFilter.ts'
import * as EventStore from '../../src/EventSourcing/EventStore.ts'
import * as _ from '../../src/EventSourcing/SqlEventStore.ts'
import { Uuid } from '../../src/types/index.ts'
import * as fc from '../fc.ts'
import * as TestLibsqlClient from '../TestLibsqlClient.ts'
import * as TestPgClient from '../TestPgClient.ts'
import { describe, expect, it } from '../vitest.ts'
import * as TestEvents from './TestEvents.ts'

describe.each<[string, Layer.Layer<SqlClient.SqlClient, unknown>]>([
  ['LibSQL', TestLibsqlClient.layer],
  ['Postgres (PGlite)', TestPgClient.layer],
])('with %s', (name, TestSqlClient) => {
  it.effect.prop(
    'starts empty',
    [
      fc.oneof(
        fc.record(
          {
            types: fc.nonEmptyArray(fc.constantFrom(...TestEvents.EventTypes)),
            predicate: fc.dictionary(fc.string(), fc.string()),
          },
          { requiredKeys: ['types'] },
        ),
        fc.nonEmptyArray(
          fc.record(
            {
              types: fc.nonEmptyArray(fc.constantFrom(...TestEvents.EventTypes)),
              predicate: fc.dictionary(fc.string(), fc.string()),
            },
            { requiredKeys: ['types'] },
          ),
        ),
      ),
    ],
    ([filter]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(TestEvents.Event)

        const actual = yield* eventStore.query(filter)
        const all = yield* allEvents(eventStore)

        expect(actual).toStrictEqual(Option.none())
        expect(all).toStrictEqual([])
      }).pipe(Effect.provide(Layer.mock(Uuid.GenerateUuid, {})), Effect.provide(TestSqlClient)),
    { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
  )

  describe('when the last known position is none', () => {
    it.effect.prop(
      'appends the event',
      [
        fc.oneof(TestEvents.thingStarted(), TestEvents.thingFinished()),
        fc.oneof(
          fc.record(
            {
              types: fc.nonEmptyArray(fc.constantFrom('ThingStarted', 'ThingFinished')),
              predicate: fc.dictionary(fc.string(), fc.string()),
            },
            { requiredKeys: ['types'] },
          ),
          fc.nonEmptyArray(
            fc.record(
              {
                types: fc.nonEmptyArray(fc.constantFrom('ThingStarted', 'ThingFinished')),
                predicate: fc.dictionary(fc.string(), fc.string()),
              },
              { requiredKeys: ['types'] },
            ),
          ),
        ),
        fc.array(fc.oneof(TestEvents.thingRated(), TestEvents.thingReviewed(), TestEvents.thingMoved())),
      ],
      ([event, filter, otherEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(otherEvents, eventStore.append)

          yield* eventStore.appendIf(event, { filter, lastKnownPosition: Option.none() })

          const actual = yield* eventStore.query({ types: [event._tag], predicates: { thingId: event.thingId } })
          const all = yield* allEvents(eventStore)

          expect(actual).toStrictEqual(Option.some({ events: [event], lastKnownPosition: expect.anything() }))
          expect(all).toStrictEqual([...otherEvents, event])
        }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('when the last known position has not changed', () => {
    it.effect.prop(
      'appends the event',
      [fc.nonEmptyArray(TestEvents.event()), TestEvents.event()],
      ([existingEvents, event]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          const { lastKnownPosition } = yield* Effect.flatMap(
            eventStore.query({ types: TestEvents.EventTypes }),
            Effect.fromOption,
          )

          yield* eventStore.appendIf(event, {
            filter: { types: TestEvents.EventTypes },
            lastKnownPosition: Option.some(lastKnownPosition),
          })

          const all = yield* allEvents(eventStore)

          expect(all).toStrictEqual([...existingEvents, event])
        }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('when the last known position has changed', () => {
    it.effect.prop(
      'does nothing',
      [fc.array(TestEvents.event()), TestEvents.event(), fc.uuid()],
      ([existingEvents, event]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          const error = yield* Effect.flip(
            eventStore.appendIf(event, {
              filter: { types: TestEvents.EventTypes },
              lastKnownPosition: Option.some(EventStore.Position.make(existingEvents.length - 1)),
            }),
          )

          expect(error).toBeInstanceOf(EventStore.NewEventsFound)

          const all = yield* allEvents(eventStore)

          expect(all).toStrictEqual(existingEvents)
        }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  const thingId = 'thing'
  const otherThingId = 'other-thing'

  it.effect.each<
    [
      string,
      EventFilter.EventFilter<TestEvents.Event>,
      Array.NonEmptyReadonlyArray<TestEvents.Event>,
      ReadonlyArray<TestEvents.Event>,
    ]
  >([
    [
      'one type',
      { types: ['ThingStarted'] },
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
      ],
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
      ],
    ],
    [
      'multiple types',
      { types: ['ThingStarted', 'ThingFinished'] },
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingFinished({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
      ],
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingFinished({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
      ],
    ],
    [
      'other types',
      { types: ['ThingStarted'] },
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingFinished({ thingId }),
        new TestEvents.ThingStarted({ thingId }),
      ],
      [new TestEvents.ThingStarted({ thingId }), new TestEvents.ThingStarted({ thingId })],
    ],
    [
      'one predicate',
      { types: ['ThingStarted', 'ThingFinished'], predicates: { thingId } },
      [
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingFinished({ thingId }),
        new TestEvents.ThingStarted({ thingId: otherThingId }),
      ],
      [new TestEvents.ThingStarted({ thingId }), new TestEvents.ThingFinished({ thingId })],
    ],
    [
      'two types and two predicates',
      { types: ['ThingRated', 'ThingReviewed'], predicates: { thingId, rating: 'good' } },
      [
        new TestEvents.ThingRated({ thingId, rating: 'good' }),
        new TestEvents.ThingRated({ thingId, rating: 'bad' }),
        new TestEvents.ThingRated({ thingId: otherThingId, rating: 'good' }),
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingReviewed({ thingId, rating: 'good' }),
        new TestEvents.ThingReviewed({ thingId, rating: 'bad' }),
        new TestEvents.ThingReviewed({ thingId: otherThingId, rating: 'good' }),
      ],
      [
        new TestEvents.ThingRated({ thingId, rating: 'good' }),
        new TestEvents.ThingReviewed({ thingId, rating: 'good' }),
      ],
    ],
    [
      'multiple filters',
      [
        { types: ['ThingRated', 'ThingReviewed'], predicates: { thingId, rating: 'good' } },
        { types: ['ThingReviewed'], predicates: { thingId, rating: 'bad' } },
      ],
      [
        new TestEvents.ThingRated({ thingId, rating: 'good' }),
        new TestEvents.ThingRated({ thingId, rating: 'bad' }),
        new TestEvents.ThingRated({ thingId: otherThingId, rating: 'good' }),
        new TestEvents.ThingStarted({ thingId }),
        new TestEvents.ThingReviewed({ thingId, rating: 'good' }),
        new TestEvents.ThingReviewed({ thingId, rating: 'bad' }),
        new TestEvents.ThingReviewed({ thingId: otherThingId, rating: 'good' }),
      ],
      [
        new TestEvents.ThingRated({ thingId, rating: 'good' }),
        new TestEvents.ThingReviewed({ thingId, rating: 'good' }),
        new TestEvents.ThingReviewed({ thingId, rating: 'bad' }),
      ],
    ],
    [
      'predicates stored as strings',
      [
        { types: ['ThingMoved'], predicates: { location: { x: 1, y: 2 } } },
        { types: ['ThingMoved'], predicates: { location: { x: 3, y: 4 } } },
      ],
      [
        new TestEvents.ThingMoved({ thingId, location: { x: 1, y: 2 } }),
        new TestEvents.ThingMoved({ thingId, location: { x: 3, y: 4 } }),
        new TestEvents.ThingMoved({ thingId, location: { x: 1, y: 4 } }),
      ],
      [
        new TestEvents.ThingMoved({ thingId, location: { x: 1, y: 2 } }),
        new TestEvents.ThingMoved({ thingId, location: { x: 3, y: 4 } }),
      ],
    ],
  ])(
    'find events (%s)',
    ([, filter, events, expected]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(TestEvents.Event)

        yield* Effect.forEach(events, eventStore.append)

        const actual = yield* eventStore.query(filter)

        expect(actual).toStrictEqual(Option.some({ events: expected, lastKnownPosition: expect.anything() }))
      }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
    { timeout: Duration.toMillis('60 seconds') },
  )

  describe('all', () => {
    it.effect('streams nothing when there are no events', () =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(TestEvents.Event)

        const actual = yield* Stream.runCollect(eventStore.all)

        expect(actual).toStrictEqual([])
      }).pipe(Effect.provide(Layer.mock(Uuid.GenerateUuid, {})), Effect.provide(TestSqlClient)),
    )

    it.effect.prop(
      'streams every event',
      [fc.nonEmptyArray(TestEvents.event())],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.all)

          expect(actual).toStrictEqual([Array.map(events, event => ({ event, cursor: expect.anything() }))])
        }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams many events in pages',
      [fc.array(TestEvents.event(), { minLength: 7, maxLength: 9 })],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          const pages = yield* Stream.runCollect(eventStore.all)

          expect(Array.map(pages, page => page.length)).toStrictEqual([3, 3, events.length - 6])
          expect(eventsIn(pages)).toStrictEqual(events)

          const eventsAfterEachEvent = yield* Effect.forEach(Array.flatten(pages), ({ cursor }) =>
            Effect.map(Stream.runCollect(eventStore.since(cursor)), eventsIn),
          )

          expect(eventsAfterEachEvent).toStrictEqual(Array.map(events, (_, index) => Array.drop(events, index + 1)))
        }).pipe(
          Effect.provide(Layer.succeed(_.PageSize, 3)),
          Effect.provide(Uuid.layer),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('since', () => {
    it.effect.prop(
      'streams events since a position',
      [fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
      ([existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(newEvents, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.since(cursor))

          expect(actual).toStrictEqual([Array.map(newEvents, event => ({ event, cursor: expect.anything() }))])
        }).pipe(Effect.provide(Uuid.layer), Effect.provide(TestSqlClient)),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams events matching a filter since a position',
      [
        fc.nonEmptyArray(TestEvents.event()),
        fc.nonEmptyArray(fc.oneof(TestEvents.thingStarted(), TestEvents.thingFinished())),
      ],
      ([existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(newEvents, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.since(cursor, { types: ['ThingStarted'] }))

          expect(actual).toStrictEqual(
            Array.match(
              Array.filter(newEvents, event => event._tag === 'ThingStarted'),
              {
                onEmpty: () => [],
                onNonEmpty: events => [Array.map(events, event => ({ event, cursor: expect.anything() }))],
              },
            ),
          )
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect("fails with a cursor it can't read", () =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(TestEvents.Event)

        const actual = yield* Effect.flip(Stream.runCollect(eventStore.since(EventStore.Cursor.make('not a cursor'))))

        expect(actual).toBeInstanceOf(EventStore.FailedToGetEvents)
      }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
    )
  })

  describe('subscribe', () => {
    it.effect.prop(
      'streams existing events and then new ones',
      [fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
      ([existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)
          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(existingEvents, eventStore.append)

          const received = yield* receive(eventStore.subscribe({ after: cursor }))
          const receivedExistingEvents = yield* Queue.takeN(received, existingEvents.length)

          yield* Effect.forEach(newEvents, eventStore.append)

          const receivedNewEvents = yield* Queue.takeN(received, newEvents.length)

          expect([receivedExistingEvents, receivedNewEvents]).toStrictEqual([existingEvents, newEvents])
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams new events appended with a condition',
      [fc.nonEmptyArray(TestEvents.event()), TestEvents.event()],
      ([existingEvents, newEvent]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)
          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(existingEvents, eventStore.append)

          const received = yield* receive(eventStore.subscribe({ after: cursor }))
          yield* Queue.takeN(received, existingEvents.length)

          yield* eventStore.appendIf(newEvent, {
            filter: { types: [newEvent._tag], predicates: { thingId: newEvent.thingId } },
            lastKnownPosition: Option.none(),
          })

          const actual = yield* Queue.take(received)

          expect(actual).toStrictEqual(newEvent)
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    describe('while the session can be shared', { skip: name === 'Postgres (PGlite)' }, () => {
      it.effect.prop(
        "doesn't miss events written while it's handling earlier ones",
        [fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
        ([existingEvents, newEvents]) =>
          Effect.gen(function* () {
            const eventStore = yield* _.make(TestEvents.Event)
            const cursor = yield* eventStore.latestCursor
            const received = yield* Queue.unbounded<TestEvents.Event>()
            const handling = yield* Deferred.make<undefined>()
            const finishHandling = yield* Deferred.make<undefined>()

            yield* Effect.forEach(existingEvents, eventStore.append)

            yield* Effect.forkChild(
              Stream.runForEach(eventStore.subscribe({ after: cursor }), page =>
                Effect.gen(function* () {
                  yield* Queue.offerAll(received, Array.map(page, Struct.get('event')))
                  yield* Deferred.succeed(handling, undefined)
                  yield* Deferred.await(finishHandling)
                }),
              ),
            )

            yield* Deferred.await(handling)
            yield* Effect.forEach(newEvents, eventStore.append)
            yield* Deferred.succeed(finishHandling, undefined)

            const actual = yield* Queue.takeN(received, existingEvents.length + newEvents.length)

            expect(actual).toStrictEqual([...existingEvents, ...newEvents])
          }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
        { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
      )
    })

    it.effect.prop(
      'streams from the beginning without a cursor',
      [fc.nonEmptyArray(TestEvents.event())],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          const received = yield* receive(eventStore.subscribe())
          const actual = yield* Queue.takeN(received, events.length)

          expect(actual).toStrictEqual(events)
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams events written by another instance',
      [fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
      ([existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)
          const otherEventStore = yield* _.make(TestEvents.Event)
          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(existingEvents, eventStore.append)

          const received = yield* receive(eventStore.subscribe({ after: cursor }))
          yield* Queue.takeN(received, existingEvents.length)

          yield* Effect.forEach(newEvents, otherEventStore.append)
          yield* TestClock.adjust('1 second')

          const actual = yield* Queue.takeN(received, newEvents.length)

          expect(actual).toStrictEqual(newEvents)
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams events matching a filter',
      [fc.nonEmptyArray(fc.oneof(TestEvents.thingStarted(), TestEvents.thingFinished())), TestEvents.thingStarted()],
      ([events, lastEvent]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)
          const cursor = yield* eventStore.latestCursor
          const expected = [...Array.filter(events, event => event._tag === 'ThingStarted'), lastEvent]

          yield* Effect.forEach([...events, lastEvent], eventStore.append)

          const received = yield* receive(eventStore.subscribe({ after: cursor, filter: { types: ['ThingStarted'] } }))
          const actual = yield* Queue.takeN(received, expected.length)

          expect(actual).toStrictEqual(expected)
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('latestCursor', () => {
    it.effect.prop(
      'is the beginning when there are no events',
      [fc.nonEmptyArray(TestEvents.event())],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          const cursor = yield* eventStore.latestCursor

          yield* Effect.forEach(events, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.since(cursor))

          expect(actual).toStrictEqual([Array.map(events, event => ({ event, cursor: expect.anything() }))])
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'is the cursor of the last event',
      [fc.nonEmptyArray(TestEvents.event())],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          const { cursor } = Array.lastNonEmpty(
            yield* Effect.flatMap(Stream.runLast(eventStore.all), Effect.fromOption),
          )

          const actual = yield* eventStore.latestCursor

          expect(actual).toStrictEqual(cursor)
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('checkpoints', () => {
    it.effect.prop(
      'loads nothing when no checkpoint has been saved',
      [fc.string()],
      ([name]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          const actual = yield* eventStore.loadCheckpoint(name)

          expect(actual).toStrictEqual(Option.none())
        }).pipe(Effect.provide([Layer.mock(Uuid.GenerateUuid, {}), TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'loads a saved checkpoint',
      [fc.string(), fc.nonEmptyArray(TestEvents.event())],
      ([name, events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          const cursor = yield* eventStore.latestCursor

          yield* eventStore.saveCheckpoint(name, cursor)

          const actual = yield* eventStore.loadCheckpoint(name)

          expect(actual).toStrictEqual(Option.some(cursor))
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'replaces a saved checkpoint',
      [fc.string(), fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
      ([name, existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          yield* eventStore.saveCheckpoint(name, yield* eventStore.latestCursor)

          yield* Effect.forEach(newEvents, eventStore.append)

          const cursor = yield* eventStore.latestCursor

          yield* eventStore.saveCheckpoint(name, cursor)

          const actual = yield* eventStore.loadCheckpoint(name)

          expect(actual).toStrictEqual(Option.some(cursor))
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      "doesn't move a checkpoint backwards",
      [fc.string(), fc.nonEmptyArray(TestEvents.event()), fc.nonEmptyArray(TestEvents.event())],
      ([name, existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(existingEvents, eventStore.append)

          const earlierCursor = yield* eventStore.latestCursor

          yield* Effect.forEach(newEvents, eventStore.append)

          const laterCursor = yield* eventStore.latestCursor

          yield* eventStore.saveCheckpoint(name, laterCursor)
          yield* eventStore.saveCheckpoint(name, earlierCursor)

          const actual = yield* eventStore.loadCheckpoint(name)

          expect(actual).toStrictEqual(Option.some(laterCursor))
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'keeps checkpoints separate by name',
      [fc.uniqueArray(fc.string(), { minLength: 2, maxLength: 2 }), fc.nonEmptyArray(TestEvents.event())],
      ([[name, otherName], events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          yield* Effect.forEach(events, eventStore.append)

          yield* eventStore.saveCheckpoint(name!, yield* eventStore.latestCursor)

          const actual = yield* eventStore.loadCheckpoint(otherName!)

          expect(actual).toStrictEqual(Option.none())
        }).pipe(Effect.provide([Uuid.layer, TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      "fails to save a checkpoint with a cursor it can't read",
      [fc.string()],
      ([name]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(TestEvents.Event)

          const actual = yield* Effect.flip(eventStore.saveCheckpoint(name, EventStore.Cursor.make('not a cursor')))

          expect(actual).toBeInstanceOf(EventStore.FailedToSaveCheckpoint)
        }).pipe(Effect.provide([Layer.mock(Uuid.GenerateUuid, {}), TestSqlClient])),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })
})

describe('on Postgres', () => {
  it.effect('reads events in transaction order', () =>
    Effect.gen(function* () {
      const [laterEvent, earlierEvent] = sample(TestEvents.thingStarted(), 2)
      const sql = yield* SqlClient.SqlClient
      const eventStore = yield* _.make(TestEvents.Event)

      yield* Effect.forEach(
        [
          [laterEvent!, '10'],
          [earlierEvent!, '9'],
        ] as const,
        Effect.fnUntraced(function* ([event, transactionId]) {
          const { _tag, ...payload } = (yield* Schema.encodeEffect(TestEvents.Event)(event)) as { _tag: string }

          yield* sql`
            INSERT INTO
              events (id, type, payload, transaction_id)
            VALUES
              (
                ${event.thingId},
                ${_tag},
                ${JSON.stringify(payload)},
                ${transactionId}::XID8
              )
          `
        }),
      )

      const actual = yield* allEvents(eventStore)

      expect(actual).toStrictEqual([earlierEvent, laterEvent])
    }).pipe(Effect.provide([Uuid.layer, TestPgClient.layer])),
  )

  it.effect('has a latest cursor in transaction order', () =>
    Effect.gen(function* () {
      const [laterEvent, earlierEvent] = sample(TestEvents.thingStarted(), 2)
      const sql = yield* SqlClient.SqlClient
      const eventStore = yield* _.make(TestEvents.Event)

      yield* Effect.forEach(
        [
          [laterEvent!, '10'],
          [earlierEvent!, '9'],
        ] as const,
        Effect.fnUntraced(function* ([event, transactionId]) {
          const { _tag, ...payload } = (yield* Schema.encodeEffect(TestEvents.Event)(event)) as { _tag: string }

          yield* sql`
            INSERT INTO
              events (id, type, payload, transaction_id)
            VALUES
              (
                ${event.thingId},
                ${_tag},
                ${JSON.stringify(payload)},
                ${transactionId}::XID8
              )
          `
        }),
      )

      const { cursor } = Array.lastNonEmpty(yield* Effect.flatMap(Stream.runLast(eventStore.all), Effect.fromOption))

      const actual = yield* eventStore.latestCursor

      expect(actual).toStrictEqual(cursor)
    }).pipe(Effect.provide([Uuid.layer, TestPgClient.layer])),
  )

  it.effect('reads events from before the table was upgraded first', () =>
    Effect.gen(function* () {
      const [legacyEvent, newEvent] = sample(TestEvents.thingStarted(), 2)
      const sql = yield* SqlClient.SqlClient

      yield* sql`
        CREATE TABLE events (
          id TEXT NOT NULL PRIMARY KEY,
          type TEXT NOT NULL,
          timestamp TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
          payload JSONB NOT NULL,
          position SERIAL,
          UNIQUE (position)
        )
      `

      const { _tag, ...payload } = (yield* Schema.encodeEffect(TestEvents.Event)(legacyEvent!)) as { _tag: string }

      yield* sql`
        INSERT INTO
          events (id, type, payload)
        VALUES
          (
            ${legacyEvent!.thingId},
            ${_tag},
            ${JSON.stringify(payload)}
          )
      `

      const eventStore = yield* _.make(TestEvents.Event)

      yield* eventStore.append(newEvent!)

      const actual = yield* allEvents(eventStore)

      expect(actual).toStrictEqual([legacyEvent, newEvent])
    }).pipe(Effect.provide([Uuid.layer, TestPgClient.layer])),
  )
})

describe('on a real Postgres', { skip: process.env['SKIP_CONTAINER_TESTS'] === '1' }, () => {
  it.effect(
    "doesn't skip an event whose transaction commits after a later event",
    () =>
      Effect.gen(function* () {
        const [committedEvent, slowEvent] = sample(TestEvents.thingStarted(), 2)
        const [fastEvent] = sample(TestEvents.thingFinished(), 1)
        const sql = yield* SqlClient.SqlClient
        const eventStore = yield* _.make(TestEvents.Event)
        const slowEventAppended = yield* Deferred.make<undefined>()
        const commitSlowEvent = yield* Deferred.make<undefined>()

        yield* eventStore.append(committedEvent!)

        const slowTransaction = yield* pipe(
          eventStore.append(slowEvent!),
          Effect.andThen(Deferred.succeed(slowEventAppended, undefined)),
          Effect.andThen(Deferred.await(commitSlowEvent)),
          sql.withTransaction,
          Effect.forkScoped,
        )

        yield* Deferred.await(slowEventAppended)
        yield* eventStore.append(fastEvent!)

        const firstRead = yield* Stream.runCollect(eventStore.all)

        yield* Deferred.succeed(commitSlowEvent, undefined)
        yield* Fiber.join(slowTransaction)

        const { cursor } = yield* Effect.fromOption(Array.last(Array.flatten(firstRead)))
        const secondRead = yield* Stream.runCollect(eventStore.since(cursor))

        expect(eventsIn(firstRead)).toStrictEqual([committedEvent])
        expect(eventsIn(secondRead)).toStrictEqual([slowEvent, fastEvent])
      }).pipe(Effect.provide([Uuid.layer, RealPgClient])),
    { timeout: Duration.toMillis('1 minute') },
  )

  it.effect(
    "doesn't have a latest cursor past an event whose transaction is still open",
    () =>
      Effect.gen(function* () {
        const [committedEvent, slowEvent] = sample(TestEvents.thingStarted(), 2)
        const [fastEvent] = sample(TestEvents.thingFinished(), 1)
        const sql = yield* SqlClient.SqlClient
        const eventStore = yield* _.make(TestEvents.Event)
        const slowEventAppended = yield* Deferred.make<undefined>()
        const commitSlowEvent = yield* Deferred.make<undefined>()

        yield* eventStore.append(committedEvent!)

        const slowTransaction = yield* pipe(
          eventStore.append(slowEvent!),
          Effect.andThen(Deferred.succeed(slowEventAppended, undefined)),
          Effect.andThen(Deferred.await(commitSlowEvent)),
          sql.withTransaction,
          Effect.forkScoped,
        )

        yield* Deferred.await(slowEventAppended)
        yield* eventStore.append(fastEvent!)

        const latestCursor = yield* eventStore.latestCursor

        yield* Deferred.succeed(commitSlowEvent, undefined)
        yield* Fiber.join(slowTransaction)

        const actual = yield* Stream.runCollect(eventStore.since(latestCursor))

        expect(eventsIn(actual)).toStrictEqual([slowEvent, fastEvent])
      }).pipe(Effect.provide([Uuid.layer, RealPgClient])),
    { timeout: Duration.toMillis('1 minute') },
  )

  it.effect.each([
    [
      'appendIf',
      (eventStore: EventStore.EventStore<TestEvents.Event>, event: TestEvents.Event) =>
        eventStore.appendIf(event, { filter: { types: ['ThingStarted'] }, lastKnownPosition: Option.none() }),
    ],
    [
      'append',
      (eventStore: EventStore.EventStore<TestEvents.Event>, event: TestEvents.Event) => eventStore.append(event),
    ],
  ] as const)(
    "doesn't append past a matching event from another transaction's %s",
    ([, appendFirst]) =>
      Effect.gen(function* () {
        const [firstEvent, secondEvent] = sample(TestEvents.thingStarted(), 2)
        const sql = yield* SqlClient.SqlClient
        const eventStore = yield* _.make(TestEvents.Event)
        const firstEventAppended = yield* Deferred.make<undefined>()
        const commitFirstEvent = yield* Deferred.make<undefined>()

        const firstTransaction = yield* pipe(
          appendFirst(eventStore, firstEvent!),
          Effect.andThen(Deferred.succeed(firstEventAppended, undefined)),
          Effect.andThen(Deferred.await(commitFirstEvent)),
          sql.withTransaction,
          Effect.forkScoped,
        )

        yield* Deferred.await(firstEventAppended)

        const secondAppend = yield* Effect.forkScoped(
          eventStore.appendIf(secondEvent!, {
            filter: { types: ['ThingStarted'] },
            lastKnownPosition: Option.none(),
          }),
        )

        yield* Effect.raceFirst(
          Effect.repeat(
            sql`
              SELECT
                1
              FROM
                pg_stat_activity
              WHERE
                wait_event_type = 'Lock'
            `,
            { until: Array.isReadonlyArrayNonEmpty },
          ),
          Fiber.await(secondAppend),
        )
        yield* Deferred.succeed(commitFirstEvent, undefined)
        yield* Fiber.join(firstTransaction)

        const actual = yield* Effect.flip(Fiber.join(secondAppend))

        expect(actual).toBeInstanceOf(EventStore.NewEventsFound)
      }).pipe(Effect.provide([Uuid.layer, RealPgClient])),
    { timeout: Duration.toMillis('1 minute') },
  )

  it.effect(
    "doesn't miss events written while a subscriber is handling earlier ones",
    () =>
      Effect.gen(function* () {
        const [existingEvent, newEvent] = sample(TestEvents.thingStarted(), 2)
        const eventStore = yield* _.make(TestEvents.Event)
        const cursor = yield* eventStore.latestCursor
        const received = yield* Queue.unbounded<TestEvents.Event>()
        const handling = yield* Deferred.make<undefined>()
        const finishHandling = yield* Deferred.make<undefined>()

        yield* eventStore.append(existingEvent!)

        yield* Effect.forkChild(
          Stream.runForEach(eventStore.subscribe({ after: cursor }), page =>
            Effect.gen(function* () {
              yield* Queue.offerAll(received, Array.map(page, Struct.get('event')))
              yield* Deferred.succeed(handling, undefined)
              yield* Deferred.await(finishHandling)
            }),
          ),
        )

        yield* Deferred.await(handling)
        yield* eventStore.append(newEvent!)
        yield* Deferred.succeed(finishHandling, undefined)

        const actual = yield* Queue.takeN(received, 2)

        expect(actual).toStrictEqual([existingEvent, newEvent])
      }).pipe(Effect.provide([Uuid.layer, RealPgClient])),
    { timeout: Duration.toMillis('1 minute') },
  )

  it.effect(
    'wakes up a subscriber when an event held back by an open transaction becomes visible',
    () =>
      Effect.gen(function* () {
        const [committedEvent, slowEvent] = sample(TestEvents.thingStarted(), 2)
        const [fastEvent] = sample(TestEvents.thingFinished(), 1)
        const sql = yield* SqlClient.SqlClient
        const eventStore = yield* _.make(TestEvents.Event)
        const otherEventStore = yield* _.make(TestEvents.Event)
        const cursor = yield* eventStore.latestCursor
        const slowEventAppended = yield* Deferred.make<undefined>()
        const commitSlowEvent = yield* Deferred.make<undefined>()

        yield* eventStore.append(committedEvent!)

        const received = yield* receive(eventStore.subscribe({ after: cursor }))
        yield* Queue.take(received)

        const slowTransaction = yield* pipe(
          otherEventStore.append(slowEvent!),
          Effect.andThen(Deferred.succeed(slowEventAppended, undefined)),
          Effect.andThen(Deferred.await(commitSlowEvent)),
          sql.withTransaction,
          Effect.forkScoped,
        )

        yield* Deferred.await(slowEventAppended)
        yield* otherEventStore.append(fastEvent!)
        yield* TestClock.adjust('1 second')

        const receivedWhileHeldBack = yield* Queue.size(received)

        yield* Deferred.succeed(commitSlowEvent, undefined)
        yield* Fiber.join(slowTransaction)
        yield* TestClock.adjust('1 second')

        const actual = yield* Queue.takeN(received, 2)

        expect(receivedWhileHeldBack).toStrictEqual(0)
        expect(actual).toStrictEqual([slowEvent, fastEvent])
      }).pipe(Effect.provide([Uuid.layer, RealPgClient])),
    { timeout: Duration.toMillis('1 minute') },
  )
})

const RealPgClient = Layer.unwrap(
  Effect.gen(function* () {
    const container = yield* Effect.acquireRelease(
      Effect.promise(() => new PostgreSqlContainer('pgvector/pgvector:pg17').start()),
      container => Effect.promise(() => container.stop()),
    )

    return PgClient.layer({ url: Redacted.make(container.getConnectionUri()) })
  }),
)

const allEvents = (eventStore: EventStore.EventStore<TestEvents.Event>) =>
  Effect.map(Stream.runCollect(eventStore.all), eventsIn)

const receive = Effect.fnUntraced(function* <E, R>(pages: Stream.Stream<EventStore.Page<TestEvents.Event>, E, R>) {
  const received = yield* Queue.unbounded<TestEvents.Event>()

  yield* Effect.forkChild(
    Stream.runForEach(pages, page => Queue.offerAll(received, Array.map(page, Struct.get('event')))),
  )

  return received
})

const eventsIn = (pages: ReadonlyArray<EventStore.Page<TestEvents.Event>>) =>
  Array.flatMap(pages, Array.map(Struct.get('event')))
