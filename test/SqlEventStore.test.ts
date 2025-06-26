import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { it, test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Effect, Equal, Layer, TestClock } from 'effect'
import {
  CodeOfConductWasAgreed,
  CommentEvent,
  ExistenceOfVerifiedEmailAddressWasConfirmed,
} from '../src/Comments/Events.js'
import { DatasetReviewEvent } from '../src/DatasetReviews/Events.js'
import * as EventStore from '../src/EventStore.js'
import * as _ from '../src/SqlEventStore.js'
import { Uuid } from '../src/types/index.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

it.prop([fc.string(), fc.uuid()])('starts empty', (resourceType, resourceId) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make(resourceType, CommentEvent)

    const actual = yield* eventStore.getEvents(resourceId)
    const all = yield* eventStore.getAllEvents

    expect(actual).toStrictEqual({ events: [], latestVersion: 0 })
    expect(all).toStrictEqual([])
  }).pipe(
    Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
    Effect.provide(TestLibsqlClient),
    EffectTest.run,
  ),
)

describe('when the last known version is 0', () => {
  it.prop([fc.string(), fc.uuid(), fc.nonEmptyArray(fc.commentEvent())])(
    'creates a new resource',
    (resourceType, resourceId, events) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(resourceType, CommentEvent)

        yield* eventStore.commitEvents(resourceId, 0)(...events)

        const actual = yield* eventStore.getEvents(resourceId)
        const all = yield* eventStore.getAllEvents

        expect(actual).toStrictEqual({ events, latestVersion: events.length })
        expect(all).toStrictEqual(Array.map(events, (event, i) => ({ event, resourceId, version: i + 1 })))
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(TestLibsqlClient),
        EffectTest.run,
      ),
  )

  describe('but the resource exists with a different type', () => {
    it.prop([
      fc.tuple(fc.string(), fc.string()).filter(([a, b]) => !Equal.equals(a, b)),
      fc.uuid(),
      fc.nonEmptyArray(fc.commentEvent()),
      fc.nonEmptyArray(fc.datasetReviewEvent()),
    ])('does nothing', ([resourceType, otherResourceType], resourceId, events, otherEvents) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(resourceType, CommentEvent)
        const otherEventStore = yield* _.make(otherResourceType, DatasetReviewEvent)

        yield* otherEventStore.commitEvents(resourceId, 0)(...otherEvents)

        const error = yield* Effect.flip(eventStore.commitEvents(resourceId, 0)(...events))

        expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

        const actual = yield* eventStore.getEvents(resourceId)
        const all = yield* eventStore.getAllEvents
        const actualOther = yield* otherEventStore.getEvents(resourceId)
        const allOther = yield* otherEventStore.getAllEvents

        expect(actual).toStrictEqual({ events: [], latestVersion: 0 })
        expect(all).toHaveLength(0)
        expect(actualOther).toStrictEqual({ events: otherEvents, latestVersion: otherEvents.length })
        expect(allOther).toHaveLength(otherEvents.length)
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(TestLibsqlClient),
        EffectTest.run,
      ),
    )
  })
})

describe('when the last known version is invalid', () => {
  describe('when the resource does not exist', () => {
    it.prop([fc.string(), fc.uuid(), fc.integer({ min: 1 }), fc.nonEmptyArray(fc.commentEvent())])(
      'does not create a resource',
      (resourceType, resourceId, lastKnownVersion, events) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(resourceType, CommentEvent)

          const error = yield* Effect.flip(eventStore.commitEvents(resourceId, lastKnownVersion)(...events))

          expect(error).toBeInstanceOf(EventStore.FailedToCommitEvent)

          const actual = yield* eventStore.getEvents(resourceId)
          const all = yield* eventStore.getAllEvents

          expect(actual).toStrictEqual({ events: [], latestVersion: 0 })
          expect(all).toStrictEqual([])
        }).pipe(
          Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
          Effect.provide(TestLibsqlClient),
          EffectTest.run,
        ),
    )
  })

  describe('when the resource does exist', () => {
    it.prop([
      fc.string(),
      fc.uuid(),
      fc
        .nonEmptyArray(fc.commentEvent())
        .chain(existingEvents => fc.tuple(fc.constant(existingEvents), fc.integer({ min: existingEvents.length + 1 }))),
      fc.nonEmptyArray(fc.commentEvent()),
    ])('does nothing', (resourceType, resourceId, [existingEvents, lastKnownVersion], events) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(resourceType, CommentEvent)

        yield* eventStore.commitEvents(resourceId, 0)(...existingEvents)

        const error = yield* Effect.flip(eventStore.commitEvents(resourceId, lastKnownVersion)(...events))

        expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

        const actual = yield* eventStore.getEvents(resourceId)
        const all = yield* eventStore.getAllEvents

        expect(actual).toStrictEqual({
          events: existingEvents,
          latestVersion: existingEvents.length,
        })
        expect(all).toHaveLength(existingEvents.length)
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(TestLibsqlClient),
        EffectTest.run,
      ),
    )
  })
})

describe('when the last known version is up to date', () => {
  it.prop([fc.string(), fc.uuid(), fc.commentEvent(), fc.commentEvent()])(
    'updates an existing resource',
    (resourceType, resourceId, event1, event2) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(resourceType, CommentEvent)

        yield* eventStore.commitEvents(resourceId, 0)(event1)
        yield* eventStore.commitEvents(resourceId, 1)(event2)

        const actual = yield* eventStore.getEvents(resourceId)
        const all = yield* eventStore.getAllEvents

        expect(actual).toStrictEqual({ events: [event1, event2], latestVersion: 2 })
        expect(all).toStrictEqual([
          { event: event1, resourceId, version: 1 },
          { event: event2, resourceId, version: 2 },
        ])
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(TestLibsqlClient),
        EffectTest.run,
      ),
  )
})

describe('when the last known version is out of date', () => {
  it.prop([
    fc.string(),
    fc.uuid(),
    fc.nonEmptyArray(fc.commentEvent()).chain(existingEvents =>
      fc.tuple(
        fc.constant(existingEvents),
        fc.integer().filter(lastKnownVersion => lastKnownVersion !== existingEvents.length),
      ),
    ),
    fc.nonEmptyArray(fc.commentEvent()),
  ])('does not replace an event', (resourceType, resourceId, [existingEvents, lastKnownVersion], events) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make(resourceType, CommentEvent)

      yield* eventStore.commitEvents(resourceId, 0)(...existingEvents)

      const error = yield* Effect.flip(eventStore.commitEvents(resourceId, lastKnownVersion)(...events))

      expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

      const actual = yield* eventStore.getEvents(resourceId)
      const all = yield* eventStore.getAllEvents

      expect(actual).toStrictEqual({
        events: existingEvents,
        latestVersion: existingEvents.length,
      })
      expect(all).toHaveLength(existingEvents.length)
    }).pipe(
      Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

it.prop([
  fc.string(),
  fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => !Equal.equals(a, b)),
  fc.commentEvent(),
  fc.commentEvent(),
  fc.commentEvent(),
])('isolates resources', (resourceType, [resourceId1, resourceId2], event1, event2, event3) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make(resourceType, CommentEvent)

    yield* eventStore.commitEvents(resourceId1, 0)(event1)
    yield* TestClock.adjust('1 second')
    yield* eventStore.commitEvents(resourceId2, 0)(event2)
    yield* TestClock.adjust('1 second')
    yield* eventStore.commitEvents(resourceId2, 1)(event3)

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
  }).pipe(Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make), Effect.provide(TestLibsqlClient), EffectTest.run),
)

test.each([
  [
    'one type',
    ['CodeOfConductWasAgreed'],
    [new CodeOfConductWasAgreed(), new CodeOfConductWasAgreed(), new CodeOfConductWasAgreed()],
    3,
  ],
  [
    'multiple types',
    ['CodeOfConductWasAgreed', 'ExistenceOfVerifiedEmailAddressWasConfirmed'],
    [new CodeOfConductWasAgreed(), new ExistenceOfVerifiedEmailAddressWasConfirmed(), new CodeOfConductWasAgreed()],
    3,
  ],
  [
    'other types',
    ['CodeOfConductWasAgreed'],
    [new CodeOfConductWasAgreed(), new ExistenceOfVerifiedEmailAddressWasConfirmed(), new CodeOfConductWasAgreed()],
    2,
  ],
] as Array.NonEmptyReadonlyArray<
  [string, Array.NonEmptyReadonlyArray<CommentEvent['_tag']>, Array.NonEmptyReadonlyArray<CommentEvent>, number]
>)('find events of a certain type (%s)', (_name, types, events, expectedLength) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make('Comment', CommentEvent)

    yield* eventStore.commitEvents(Uuid.Uuid('872d24c0-a78a-4a45-9ed0-051a38306707'), 0)(...events)

    const actual = yield* eventStore.getAllEventsOfType(...types)

    expect(actual).toHaveLength(expectedLength)
  }).pipe(Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make), Effect.provide(TestLibsqlClient), EffectTest.run),
)

const TestLibsqlClient = Layer.unwrapScoped(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const file = yield* fs.makeTempFileScoped()

    return LibsqlClient.layer({ url: `file:${file}` })
  }),
).pipe(Layer.provide(NodeFileSystem.layer))
