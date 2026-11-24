import { Effect, Layer, pipe, Queue, Ref } from 'effect'
import { sample } from 'fast-check'
import * as _ from '../src/EventDispatcher.ts'
import type * as Events from '../src/Events.ts'
import * as EventStore from '../src/EventStore.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'
import * as SqlEventStore from '../src/SqlEventStore.ts'
import { Uuid } from '../src/types/index.ts'
import * as fc from './fc.ts'
import * as TestLibsqlClient from './TestLibsqlClient.ts'
import { describe, expect, it } from './vitest.ts'

describe('replayExistingEvents', () => {
  it.effect('dispatches existing events to every subscriber', () =>
    Effect.gen(function* () {
      const events = sample(fc.commentEvent(), 3)
      const firstSubscriber = yield* subscribe
      const secondSubscriber = yield* subscribe

      yield* Effect.forEach(events, EventStore.append)

      yield* _.replayExistingEvents

      const actual = yield* Effect.all([
        Queue.takeN(firstSubscriber, events.length),
        Queue.takeN(secondSubscriber, events.length),
      ])

      expect(actual).toStrictEqual([events, events])
    }).pipe(Effect.provide(TestLayer)),
  )
})

describe('worker', () => {
  it.effect('dispatches events as they are appended after replaying', () =>
    Effect.gen(function* () {
      const [existingEvent, firstNewEvent, secondNewEvent] = sample(fc.commentEvent(), 3)
      const subscriber = yield* subscribe

      yield* EventStore.append(existingEvent!)
      yield* _.replayExistingEvents
      yield* Queue.take(subscriber)
      yield* Layer.build(_.worker)

      yield* EventStore.append(firstNewEvent!)
      const firstReceived = yield* Queue.take(subscriber)

      yield* EventStore.append(secondNewEvent!)
      const secondReceived = yield* Queue.take(subscriber)

      expect([firstReceived, secondReceived]).toStrictEqual([firstNewEvent, secondNewEvent])
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect("doesn't dispatch replayed events again", () =>
    Effect.gen(function* () {
      const existingEvents = sample(fc.commentEvent(), 3)
      const [newEvent] = sample(fc.commentEvent(), 1)
      const subscriber = yield* subscribe

      yield* Effect.forEach(existingEvents, EventStore.append)
      yield* _.replayExistingEvents
      yield* Queue.takeN(subscriber, existingEvents.length)
      yield* Layer.build(_.worker)

      yield* EventStore.append(newEvent!)

      const actual = yield* Queue.take(subscriber)

      expect(actual).toStrictEqual(newEvent)
      expect(yield* Queue.size(subscriber)).toStrictEqual(0)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('stops dispatching to a subscriber that fails, but carries on with the others', () =>
    Effect.gen(function* () {
      const [firstEvent, secondEvent] = sample(fc.commentEvent(), 2)
      const dispatcher = yield* _.EventDispatcher
      const failingSubscriberCalls = yield* Ref.make(0)
      const otherSubscriber = yield* subscribe

      yield* dispatcher.addSubscriber(() =>
        Effect.andThen(
          Ref.update(failingSubscriberCalls, calls => calls + 1),
          Effect.die('unable to update'),
        ),
      )

      yield* _.replayExistingEvents
      yield* Layer.build(_.worker)

      yield* EventStore.append(firstEvent!)
      const firstReceived = yield* Queue.take(otherSubscriber)

      yield* EventStore.append(secondEvent!)
      const secondReceived = yield* Queue.take(otherSubscriber)

      expect([firstReceived, secondReceived]).toStrictEqual([firstEvent, secondEvent])
      expect(yield* Ref.get(failingSubscriberCalls)).toStrictEqual(1)
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('dispatches events from the beginning when there was nothing to replay', () =>
    Effect.gen(function* () {
      const events = sample(fc.commentEvent(), 3)
      const subscriber = yield* subscribe

      yield* _.replayExistingEvents
      yield* Layer.build(_.worker)

      yield* Effect.forEach(events, EventStore.append)

      const actual = yield* Queue.takeN(subscriber, events.length)

      expect(actual).toStrictEqual(events)
    }).pipe(Effect.provide(TestLayer)),
  )
})

const subscribe = Effect.gen(function* () {
  const dispatcher = yield* _.EventDispatcher
  const received = yield* Queue.unbounded<Events.Event>()

  yield* dispatcher.addSubscriber(events => Queue.offerAll(received, events))

  return received
})

const TestLayer = pipe(
  Layer.mergeAll(_.EventDispatcherLayer, SqlEventStore.layer),
  Layer.provideMerge(
    Layer.mergeAll(Uuid.layer, Layer.mock(SensitiveDataStore.SensitiveDataStore, {}), TestLibsqlClient.layer),
  ),
)
