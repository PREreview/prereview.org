import { LibsqlClient } from '@effect/sql-libsql'
import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Config, Effect, Equal, TestContext } from 'effect'
import * as EventStore from '../src/EventStore.js'
import * as _ from '../src/LibsqlEventStore.js'
import { Uuid } from '../src/types/index.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

it.prop([fc.uuid()])('starts empty', resourceId =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    const actual = yield* eventStore.getEvents(resourceId)
    const all = yield* eventStore.getAllEvents

    expect(actual).toStrictEqual({ events: [], latestVersion: 0 })
    expect(all).toStrictEqual([])
  }).pipe(
    Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
    Effect.provide(LibsqlClient.layer({ url: Config.succeed(':memory:') })),
    Effect.provide(TestContext.TestContext),
    Effect.runPromise,
  ),
)

it.prop([fc.uuid(), fc.feedbackEvent()])('creates a new resource', (resourceId, event) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    yield* eventStore.commitEvent(resourceId, 0)(event)

    const actual = yield* eventStore.getEvents(resourceId)
    const all = yield* eventStore.getAllEvents

    expect(actual).toStrictEqual({ events: [event], latestVersion: 1 })
    expect(all).toStrictEqual([{ event, resourceId, version: 1 }])
  }).pipe(
    Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
    Effect.provide(LibsqlClient.layer({ url: Config.succeed(':memory:') })),
    Effect.provide(TestContext.TestContext),
    Effect.runPromise,
  ),
)

describe('when the last known version is up to date', () => {
  it.prop([fc.uuid(), fc.feedbackEvent(), fc.feedbackEvent()])(
    'updates an existing resource',
    (resourceId, event1, event2) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        yield* eventStore.commitEvent(resourceId, 0)(event1)
        yield* eventStore.commitEvent(resourceId, 1)(event2)

        const actual = yield* eventStore.getEvents(resourceId)
        const all = yield* eventStore.getAllEvents

        expect(actual).toStrictEqual({ events: [event1, event2], latestVersion: 2 })
        expect(all).toStrictEqual([
          { event: event1, resourceId, version: 1 },
          { event: event2, resourceId, version: 2 },
        ])
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(LibsqlClient.layer({ url: Config.succeed(':memory:') })),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )
})

describe('when the last known version is out of date', () => {
  it.prop([
    fc.uuid(),
    fc
      .integer({ min: 2 })
      .chain(latestVersion => fc.tuple(fc.constant(latestVersion), fc.integer({ max: latestVersion - 1 }))),
    fc.feedbackEvent(),
    fc.feedbackEvent(),
    fc.feedbackEvent(),
  ])('does not replace an event', (resourceId, [event2Version, lastKnownVersion], event1, event2, event3) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make

      yield* eventStore.commitEvent(resourceId, 0)(event1)
      yield* eventStore.commitEvent(resourceId, event2Version - 1)(event2)

      const error = yield* Effect.flip(eventStore.commitEvent(resourceId, lastKnownVersion)(event3))

      expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

      const actual = yield* eventStore.getEvents(resourceId)
      const all = yield* eventStore.getAllEvents

      expect(actual).toStrictEqual({ events: [event1, event2], latestVersion: event2Version })
      expect(all).toStrictEqual([
        { event: event1, resourceId, version: 1 },
        { event: event2, resourceId, version: event2Version },
      ])
    }).pipe(
      Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
      Effect.provide(LibsqlClient.layer({ url: Config.succeed(':memory:') })),
      Effect.provide(TestContext.TestContext),
      Effect.runPromise,
    ),
  )
})

it.prop([
  fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => !Equal.equals(a, b)),
  fc.feedbackEvent(),
  fc.feedbackEvent(),
  fc.feedbackEvent(),
])('isolates resources', ([resourceId1, resourceId2], event1, event2, event3) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    yield* eventStore.commitEvent(resourceId1, 0)(event1)
    yield* eventStore.commitEvent(resourceId2, 0)(event2)
    yield* eventStore.commitEvent(resourceId2, 1)(event3)

    const actual1 = yield* eventStore.getEvents(resourceId1)

    expect(actual1).toStrictEqual({ events: [event1], latestVersion: 1 })

    const actual2 = yield* eventStore.getEvents(resourceId2)

    expect(actual2).toStrictEqual({ events: [event2, event3], latestVersion: 2 })

    const all = yield* eventStore.getAllEvents

    expect(all).toStrictEqual([
      { event: event1, resourceId: resourceId1, version: 1 },
      { event: event2, resourceId: resourceId2, version: 1 },
      { event: event3, resourceId: resourceId2, version: 2 },
    ])
  }).pipe(
    Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
    Effect.provide(LibsqlClient.layer({ url: Config.succeed(':memory:') })),
    Effect.provide(TestContext.TestContext),
    Effect.runPromise,
  ),
)
