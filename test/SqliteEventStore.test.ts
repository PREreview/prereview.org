import { SqliteClient } from '@effect/sql-sqlite-node'
import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Config, Effect, Equal, TestContext } from 'effect'
import * as EventStore from '../src/EventStore.js'
import * as _ from '../src/SqliteEventStore.js'
import * as fc from './fc.js'

it.prop([fc.uuid()])('starts empty', resourceId =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    const actual = yield* eventStore.getEvents(resourceId)

    expect(actual).toStrictEqual({ events: [], latestVersion: 0 })
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: Config.succeed(':memory:') })),
    Effect.provide(TestContext.TestContext),
    Effect.runPromise,
  ),
)

it.prop([fc.uuid(), fc.feedbackEvent()])('creates a new resource', (resourceId, event) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    yield* eventStore.commitEvent(resourceId, 0)(event)

    const actual = yield* eventStore.getEvents(resourceId)

    expect(actual).toStrictEqual({ events: [event], latestVersion: 1 })
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: Config.succeed(':memory:') })),
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

        expect(actual).toStrictEqual({ events: [event1, event2], latestVersion: 2 })
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: Config.succeed(':memory:') })),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )
})

describe('when the last known version is out of date', () => {
  it.prop([fc.uuid(), fc.feedbackEvent(), fc.feedbackEvent()])(
    'does not replace an event',
    (resourceId, event1, event2) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        yield* eventStore.commitEvent(resourceId, 0)(event1)

        const error = yield* Effect.flip(eventStore.commitEvent(resourceId, 0)(event2))

        expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

        const actual = yield* eventStore.getEvents(resourceId)

        expect(actual).toStrictEqual({ events: [event1], latestVersion: 1 })
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: Config.succeed(':memory:') })),
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
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: Config.succeed(':memory:') })),
    Effect.provide(TestContext.TestContext),
    Effect.runPromise,
  ),
)
