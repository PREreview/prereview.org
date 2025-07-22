import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { it, test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Array, Effect, Equal, Layer, Struct, TestClock } from 'effect'
import {
  CodeOfConductForCommentWasAgreed,
  CommentEvent,
  ExistenceOfVerifiedEmailAddressForCommentWasConfirmed,
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
    const eventStore = yield* _.make(
      resourceType,
      'commentId',
      Array.map(CommentEvent.members, Struct.get('_tag')),
      CommentEvent,
    )

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
  it.prop([fc.string(), fc.commentEvent()])('creates a new resource', (resourceType, event) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make(
        resourceType,
        'commentId',
        Array.map(CommentEvent.members, Struct.get('_tag')),
        CommentEvent,
      )

      yield* eventStore.commitEvent(event.commentId, 0)(event)

      const actual = yield* eventStore.getEvents(event.commentId)
      const all = yield* eventStore.getAllEvents

      expect(actual).toStrictEqual({ events: [event], latestVersion: 1 })
      expect(all).toStrictEqual([{ event, resourceId: event.commentId, version: 1 }])
    }).pipe(
      Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )

  describe('but the resource exists with a different type', () => {
    it.prop([
      fc.tuple(fc.string(), fc.string()).filter(([a, b]) => !Equal.equals(a, b)),
      fc
        .uuid()
        .chain(uuid =>
          fc.tuple(
            fc.commentEvent({ commentId: fc.constant(uuid) }),
            fc.nonEmptyArray(fc.datasetReviewEvent({ datasetReviewId: fc.constant(uuid) })),
          ),
        ),
    ])('does nothing', ([resourceType, otherResourceType], [event, otherEvents]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(
          resourceType,
          'commentId',
          Array.map(CommentEvent.members, Struct.get('_tag')),
          CommentEvent,
        )
        const otherEventStore = yield* _.make(
          otherResourceType,
          'datasetReviewId',
          Array.map(DatasetReviewEvent.members, Struct.get('_tag')),
          DatasetReviewEvent,
        )

        yield* Effect.forEach(otherEvents, (otherEvent, i) =>
          otherEventStore.commitEvent(event.commentId, i)(otherEvent),
        )

        const error = yield* Effect.flip(eventStore.commitEvent(event.commentId, 0)(event))

        expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

        const actual = yield* eventStore.getEvents(event.commentId)
        const all = yield* eventStore.getAllEvents
        const actualOther = yield* otherEventStore.getEvents(event.commentId)
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
    it.prop([fc.string(), fc.integer({ min: 1 }), fc.commentEvent()])(
      'does not create a resource',
      (resourceType, lastKnownVersion, event) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make(
            resourceType,
            'commentId',
            Array.map(CommentEvent.members, Struct.get('_tag')),
            CommentEvent,
          )

          const error = yield* Effect.flip(eventStore.commitEvent(event.commentId, lastKnownVersion)(event))

          expect(error).toBeInstanceOf(EventStore.FailedToCommitEvent)

          const actual = yield* eventStore.getEvents(event.commentId)
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
      fc
        .uuid()
        .chain(commentId =>
          fc
            .nonEmptyArray(fc.commentEvent({ commentId: fc.constant(commentId) }))
            .chain(existingEvents =>
              fc.tuple(
                fc.constant(existingEvents),
                fc.integer({ min: existingEvents.length + 1 }),
                fc.commentEvent({ commentId: fc.constant(commentId) }),
              ),
            ),
        ),
    ])('does nothing', (resourceType, [existingEvents, lastKnownVersion, event]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make(
          resourceType,
          'commentId',
          Array.map(CommentEvent.members, Struct.get('_tag')),
          CommentEvent,
        )

        yield* Effect.forEach(existingEvents, (existingEvent, i) =>
          eventStore.commitEvent(existingEvent.commentId, i)(existingEvent),
        )

        const error = yield* Effect.flip(eventStore.commitEvent(event.commentId, lastKnownVersion)(event))

        expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

        const actual = yield* eventStore.getEvents(event.commentId)
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
  it.prop([
    fc.string(),
    fc
      .uuid()
      .chain(commentId =>
        fc.tuple(
          fc.commentEvent({ commentId: fc.constant(commentId) }),
          fc.commentEvent({ commentId: fc.constant(commentId) }),
        ),
      ),
  ])('updates an existing resource', (resourceType, [event1, event2]) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make(
        resourceType,
        'commentId',
        Array.map(CommentEvent.members, Struct.get('_tag')),
        CommentEvent,
      )

      yield* eventStore.commitEvent(event1.commentId, 0)(event1)
      yield* eventStore.commitEvent(event2.commentId, 1)(event2)

      const actual = yield* eventStore.getEvents(event2.commentId)
      const all = yield* eventStore.getAllEvents

      expect(actual).toStrictEqual({ events: [event1, event2], latestVersion: 2 })
      expect(all).toStrictEqual([
        { event: event1, resourceId: event1.commentId, version: 1 },
        { event: event2, resourceId: event2.commentId, version: 2 },
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
    fc.uuid().chain(commentId =>
      fc.nonEmptyArray(fc.commentEvent({ commentId: fc.constant(commentId) })).chain(existingEvents =>
        fc.tuple(
          fc.constant(existingEvents),
          fc.integer().filter(lastKnownVersion => lastKnownVersion !== existingEvents.length),
          fc.commentEvent({ commentId: fc.constant(commentId) }),
        ),
      ),
    ),
  ])('does not replace an event', (resourceType, [existingEvents, lastKnownVersion, event]) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make(
        resourceType,
        'commentId',
        Array.map(CommentEvent.members, Struct.get('_tag')),
        CommentEvent,
      )

      yield* Effect.forEach(existingEvents, (existingEvent, i) =>
        eventStore.commitEvent(existingEvent.commentId, i)(existingEvent),
      )

      const error = yield* Effect.flip(eventStore.commitEvent(event.commentId, lastKnownVersion)(event))

      expect(error).toBeInstanceOf(EventStore.ResourceHasChanged)

      const actual = yield* eventStore.getEvents(event.commentId)
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
  fc
    .tuple(fc.uuid(), fc.uuid())
    .filter(([a, b]) => !Equal.equals(a, b))
    .chain(([commentId1, commentId2]) =>
      fc.tuple(
        fc.commentEvent({ commentId: fc.constant(commentId1) }),
        fc.commentEvent({ commentId: fc.constant(commentId2) }),
        fc.commentEvent({ commentId: fc.constant(commentId2) }),
      ),
    ),
])('isolates resources', (resourceType, [event1, event2, event3]) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make(
      resourceType,
      'commentId',
      Array.map(CommentEvent.members, Struct.get('_tag')),
      CommentEvent,
    )

    yield* eventStore.commitEvent(event1.commentId, 0)(event1)
    yield* TestClock.adjust('1 second')
    yield* eventStore.commitEvent(event2.commentId, 0)(event2)
    yield* TestClock.adjust('1 second')
    yield* eventStore.commitEvent(event3.commentId, 1)(event3)

    const actual1 = yield* eventStore.getEvents(event1.commentId)

    expect(actual1).toStrictEqual({ events: [event1], latestVersion: 1 })

    const actual2 = yield* eventStore.getEvents(event3.commentId)

    expect(actual2).toStrictEqual({ events: [event2, event3], latestVersion: 2 })

    const all = yield* eventStore.getAllEvents

    expect(all).toStrictEqual([
      { event: event1, resourceId: event1.commentId, version: 1 },
      { event: event2, resourceId: event2.commentId, version: 1 },
      { event: event3, resourceId: event3.commentId, version: 2 },
    ])
  }).pipe(Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make), Effect.provide(TestLibsqlClient), EffectTest.run),
)

const commentId = Uuid.Uuid('6e0508a5-b227-4bca-b534-7285ec09afff')

test.each([
  [
    'one type',
    ['CodeOfConductForCommentWasAgreed'],
    [
      new CodeOfConductForCommentWasAgreed({ commentId }),
      new CodeOfConductForCommentWasAgreed({ commentId }),
      new CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    3,
  ],
  [
    'multiple types',
    ['CodeOfConductForCommentWasAgreed', 'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed'],
    [
      new CodeOfConductForCommentWasAgreed({ commentId }),
      new ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    3,
  ],
  [
    'other types',
    ['CodeOfConductForCommentWasAgreed'],
    [
      new CodeOfConductForCommentWasAgreed({ commentId }),
      new ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    2,
  ],
] as Array.NonEmptyReadonlyArray<
  [string, Array.NonEmptyReadonlyArray<CommentEvent['_tag']>, Array.NonEmptyReadonlyArray<CommentEvent>, number]
>)('find events of a certain type (%s)', (_name, types, events, expectedLength) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make(
      'Comment',
      'commentId',
      Array.map(CommentEvent.members, Struct.get('_tag')),
      CommentEvent,
    )

    yield* Effect.forEach(events, (event, i) =>
      eventStore.commitEvent(Uuid.Uuid('872d24c0-a78a-4a45-9ed0-051a38306707'), i)(event),
    )

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
