import { Effect, Exit, Layer, pipe, Queue, Ref, Result } from 'effect'
import { sample } from 'fast-check'
import type * as Events from '../../src/Events.ts'
import * as SqlEventStore from '../../src/EventSourcing/SqlEventStore.ts'
import * as _ from '../../src/EventSourcing/StatefulQueries.ts'
import * as EventStore from '../../src/EventStore.ts'
import * as SensitiveDataStore from '../../src/SensitiveData/SensitiveDataStore.ts'
import { Uuid } from '../../src/types/index.ts'
import * as fc from '../fc.ts'
import * as TestLibsqlClient from '../TestLibsqlClient.ts'
import { describe, expect, it } from '../vitest.ts'

describe('replay', () => {
  it.effect('gives every stateful query the existing events', () =>
    Effect.gen(function* () {
      const events = sample(fc.commentEvent(), 3)
      const firstSubscriber = yield* register
      const secondSubscriber = yield* register

      yield* Effect.forEach(events, EventStore.append)

      yield* _.replay

      const actual = yield* Effect.all([
        Queue.takeN(firstSubscriber, events.length),
        Queue.takeN(secondSubscriber, events.length),
      ])

      expect(actual).toStrictEqual([events, events])
    }).pipe(Effect.provide(TestLayer)),
  )
})

describe('register', () => {
  it.effect('refuses a stateful query once the replay has started', () =>
    Effect.gen(function* () {
      const statefulQueries = yield* _.StatefulQueries

      yield* _.replay

      const actual = yield* Effect.exit(statefulQueries.register(() => Effect.void))

      expect(Exit.findDefect(actual)).toStrictEqual(Result.succeed(new _.RegisteredAfterReplay()))
    }).pipe(Effect.provide(TestLayer)),
  )
})

describe('worker', () => {
  it.effect('gives stateful queries events as they are appended after replaying', () =>
    Effect.gen(function* () {
      const [existingEvent, firstNewEvent, secondNewEvent] = sample(fc.commentEvent(), 3)
      const subscriber = yield* register

      yield* EventStore.append(existingEvent!)
      yield* _.replay
      yield* Queue.take(subscriber)
      yield* Layer.build(_.worker)

      yield* EventStore.append(firstNewEvent!)
      const firstReceived = yield* Queue.take(subscriber)

      yield* EventStore.append(secondNewEvent!)
      const secondReceived = yield* Queue.take(subscriber)

      expect([firstReceived, secondReceived]).toStrictEqual([firstNewEvent, secondNewEvent])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("doesn't give stateful queries replayed events again", () =>
    Effect.gen(function* () {
      const existingEvents = sample(fc.commentEvent(), 3)
      const [newEvent] = sample(fc.commentEvent(), 1)
      const subscriber = yield* register

      yield* Effect.forEach(existingEvents, EventStore.append)
      yield* _.replay
      yield* Queue.takeN(subscriber, existingEvents.length)
      yield* Layer.build(_.worker)

      yield* EventStore.append(newEvent!)

      const actual = yield* Queue.take(subscriber)

      expect(actual).toStrictEqual(newEvent)
      expect(yield* Queue.size(subscriber)).toStrictEqual(0)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('stops updating a stateful query that fails, but carries on with the others', () =>
    Effect.gen(function* () {
      const [firstEvent, secondEvent] = sample(fc.commentEvent(), 2)
      const statefulQueries = yield* _.StatefulQueries
      const failingSubscriberCalls = yield* Ref.make(0)
      const otherSubscriber = yield* register

      yield* statefulQueries.register(() =>
        Effect.andThen(
          Ref.update(failingSubscriberCalls, calls => calls + 1),
          Effect.die('unable to update'),
        ),
      )

      yield* _.replay
      yield* Layer.build(_.worker)

      yield* EventStore.append(firstEvent!)
      const firstReceived = yield* Queue.take(otherSubscriber)

      yield* EventStore.append(secondEvent!)
      const secondReceived = yield* Queue.take(otherSubscriber)

      expect([firstReceived, secondReceived]).toStrictEqual([firstEvent, secondEvent])
      expect(yield* Ref.get(failingSubscriberCalls)).toStrictEqual(1)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('gives stateful queries events from the beginning when there was nothing to replay', () =>
    Effect.gen(function* () {
      const events = sample(fc.commentEvent(), 3)
      const subscriber = yield* register

      yield* _.replay
      yield* Layer.build(_.worker)

      yield* Effect.forEach(events, EventStore.append)

      const actual = yield* Queue.takeN(subscriber, events.length)

      expect(actual).toStrictEqual(events)
    }).pipe(Effect.provide(TestLayer)),
  )
})

const register = Effect.gen(function* () {
  const statefulQueries = yield* _.StatefulQueries
  const received = yield* Queue.unbounded<Events.Event>()

  yield* statefulQueries.register(events => Queue.offerAll(received, events))

  return received
})

const TestLayer = pipe(
  Layer.mergeAll(_.layer, SqlEventStore.layer),
  Layer.provideMerge(
    Layer.mergeAll(Uuid.layer, Layer.mock(SensitiveDataStore.SensitiveDataStore, {}), TestLibsqlClient.layer),
  ),
)
