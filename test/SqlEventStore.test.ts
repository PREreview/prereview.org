import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { it, test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { type Array, Effect, Layer, Option, type PubSub, TestClock } from 'effect'
import * as Events from '../src/Events.ts'
import * as EventStore from '../src/EventStore.ts'
import * as _ from '../src/SqlEventStore.ts'
import { Uuid } from '../src/types/index.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

it.prop([
  fc.record(
    {
      types: fc.nonEmptyArray(fc.constantFrom(...Events.EventTypes)),
      predicate: fc.dictionary(fc.string(), fc.string()),
    },
    { requiredKeys: ['types'] },
  ),
])('starts empty', filter =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    const error = yield* Effect.flip(eventStore.query(filter))
    const all = yield* eventStore.all

    expect(error).toBeInstanceOf(EventStore.NoEventsFound)
    expect(all).toStrictEqual([])
  }).pipe(
    Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
    Effect.provide(Layer.mock(Events.Events, {} as never)),
    Effect.provide(TestLibsqlClient),
    EffectTest.run,
  ),
)

describe('when the last known event is none', () => {
  it.prop([
    fc.commentEvent(),
    fc.record(
      {
        types: fc.nonEmptyArray(fc.constantFrom(...Events.CommentEventTypes)),
        predicate: fc.dictionary(fc.string(), fc.string()),
      },
      { requiredKeys: ['types'] },
    ),
    fc.array(fc.datasetReviewEvent()),
  ])('appends the event', (event, filter, otherEvents) =>
    Effect.gen(function* () {
      const publish = jest.fn<PubSub.PubSub<Events.Event>['publish']>(_ => Effect.succeed(true))

      const eventStore = yield* Effect.provide(_.make, Layer.mock(Events.Events, { publish } as never))

      yield* Effect.forEach(otherEvents, otherEvent => eventStore.append(otherEvent))

      yield* eventStore.append(event, { filter, lastKnownEvent: Option.none() })

      const actual = yield* eventStore.query({ types: [event._tag], predicates: { commentId: event.commentId } })
      const all = yield* eventStore.all

      expect(actual).toStrictEqual({ events: [event], lastKnownEvent: expect.anything() })
      expect(all).toStrictEqual([...otherEvents, event])
      expect(publish).toHaveBeenCalledWith(event)
    }).pipe(
      Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

describe('when the last known event matches', () => {
  it.prop([fc.nonEmptyArray(fc.commentEvent()), fc.commentEvent()])('appends the event', (existingEvents, event) =>
    Effect.gen(function* () {
      const publish = jest.fn<PubSub.PubSub<unknown>['publish']>(_ => Effect.succeed(true))

      const eventStore = yield* Effect.provide(_.make, Layer.mock(Events.Events, { publish } as never))

      yield* Effect.forEach(existingEvents, existingEvent =>
        TestClock.adjustWith(eventStore.append(existingEvent), '1 milli'),
      )

      const { lastKnownEvent } = yield* eventStore.query({ types: Events.CommentEventTypes })

      yield* eventStore.append(event, {
        filter: { types: Events.CommentEventTypes },
        lastKnownEvent: Option.some(lastKnownEvent),
      })

      const all = yield* eventStore.all

      expect(all).toStrictEqual([...existingEvents, event])
      expect(publish).toHaveBeenCalledWith(event)
    }).pipe(
      Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

describe('when the last known event is different', () => {
  it.prop([fc.array(fc.commentEvent()), fc.commentEvent(), fc.uuid()])(
    'does nothing',
    (existingEvents, event, lastKnownEvent) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        yield* Effect.forEach(existingEvents, existingEvent => eventStore.append(existingEvent))

        const error = yield* Effect.flip(
          eventStore.append(event, {
            filter: { types: Events.CommentEventTypes },
            lastKnownEvent: Option.some(lastKnownEvent),
          }),
        )

        expect(error).toBeInstanceOf(EventStore.NewEventsFound)

        const all = yield* eventStore.all

        expect(all).toHaveLength(existingEvents.length)
      }).pipe(
        Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
        Effect.provide(Layer.mock(Events.Events, {} as never)),
        Effect.provide(TestLibsqlClient),
        EffectTest.run,
      ),
  )
})

const commentId = Uuid.Uuid('6e0508a5-b227-4bca-b534-7285ec09afff')

test.each([
  [
    'one type',
    ['CodeOfConductForCommentWasAgreed'],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    3,
  ],
  [
    'multiple types',
    ['CodeOfConductForCommentWasAgreed', 'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed'],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    3,
  ],
  [
    'other types',
    ['CodeOfConductForCommentWasAgreed'],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    2,
  ],
] as Array.NonEmptyReadonlyArray<
  [
    string,
    Array.NonEmptyReadonlyArray<Events.CommentEvent['_tag']>,
    Array.NonEmptyReadonlyArray<Events.CommentEvent>,
    number,
  ]
>)('find events of a certain type (%s)', (_name, types, events, expectedLength) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    yield* Effect.forEach(events, event => eventStore.append(event))

    const { events: actual } = yield* eventStore.query({ types })

    expect(actual).toHaveLength(expectedLength)
  }).pipe(
    Effect.provideServiceEffect(Uuid.GenerateUuid, Uuid.make),
    Effect.provide(Layer.mock(Events.Events, {} as never)),
    Effect.provide(TestLibsqlClient),
    EffectTest.run,
  ),
)

const TestLibsqlClient = Layer.unwrapScoped(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const file = yield* fs.makeTempFileScoped()

    return LibsqlClient.layer({ url: `file:${file}` })
  }),
).pipe(Layer.provide(NodeFileSystem.layer))
