import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { LibsqlClient } from '@effect/sql-libsql'
import { it, test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Array, Effect, Layer, Option, type PubSub, TestClock, type Types } from 'effect'
import * as Events from '../src/Events.ts'
import * as EventStore from '../src/EventStore.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'
import * as _ from '../src/SqlEventStore.ts'
import { NonEmptyString, Uuid } from '../src/types/index.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

it.prop([
  fc.oneof(
    fc.record(
      {
        types: fc.nonEmptyArray(fc.constantFrom(...Events.EventTypes)),
        predicate: fc.dictionary(fc.string(), fc.string()),
      },
      { requiredKeys: ['types'] },
    ),
    fc.nonEmptyArray(
      fc.record(
        {
          types: fc.nonEmptyArray(fc.constantFrom(...Events.EventTypes)),
          predicate: fc.dictionary(fc.string(), fc.string()),
        },
        { requiredKeys: ['types'] },
      ),
    ),
  ),
])('starts empty', filter =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    const actual = yield* eventStore.query(filter)
    const all = yield* eventStore.all

    expect(actual).toStrictEqual(Option.none())
    expect(all).toStrictEqual(Option.none())
  }).pipe(
    Effect.provideService(Uuid.GenerateUuid, Effect.sync(shouldNotBeCalled)),
    Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
    Effect.provide(Layer.mock(Events.Events, {} as never)),
    Effect.provide(TestLibsqlClient),
    EffectTest.run,
  ),
)

describe('when the last known position is none', () => {
  it.prop([
    fc.commentEvent(),
    fc.oneof(
      fc.record(
        {
          types: fc.nonEmptyArray(fc.constantFrom(...Events.CommentEventTypes)),
          predicate: fc.dictionary(fc.string(), fc.string()),
        },
        { requiredKeys: ['types'] },
      ),
      fc.nonEmptyArray(
        fc.record(
          {
            types: fc.nonEmptyArray(fc.constantFrom(...Events.CommentEventTypes)),
            predicate: fc.dictionary(fc.string(), fc.string()),
          },
          { requiredKeys: ['types'] },
        ),
      ),
    ),
    fc.array(fc.datasetReviewEvent()),
  ])('appends the event', (event, filter, otherEvents) =>
    Effect.gen(function* () {
      const publish = jest.fn<PubSub.PubSub<Events.Event>['publish']>(_ => Effect.succeed(true))

      const eventStore = yield* Effect.provide(_.make, Layer.mock(Events.Events, { publish } as never))

      yield* Effect.forEach(otherEvents, otherEvent => eventStore.append(otherEvent))

      yield* eventStore.append(event, { filter, lastKnownPosition: Option.none() })

      const actual = yield* eventStore.query({ types: [event._tag], predicates: { commentId: event.commentId } })
      const all = yield* eventStore.all

      expect(actual).toStrictEqual(Option.some({ events: [event], lastKnownPosition: expect.anything() }))
      expect(all).toStrictEqual(Option.some({ events: [...otherEvents, event], lastKnownPosition: expect.anything() }))
      expect(publish).toHaveBeenCalledWith(event)
    }).pipe(
      Effect.provide(Uuid.layer),
      Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

describe('when the last known position has not changed', () => {
  it.prop([fc.nonEmptyArray(fc.commentEvent()), fc.commentEvent()])('appends the event', (existingEvents, event) =>
    Effect.gen(function* () {
      const publish = jest.fn<PubSub.PubSub<unknown>['publish']>(_ => Effect.succeed(true))

      const eventStore = yield* Effect.provide(_.make, Layer.mock(Events.Events, { publish } as never))

      yield* Effect.forEach(existingEvents, existingEvent =>
        TestClock.adjustWith(eventStore.append(existingEvent), '1 milli'),
      )

      const { lastKnownPosition } = yield* Effect.flatten(eventStore.query({ types: Events.CommentEventTypes }))

      yield* eventStore.append(event, {
        filter: { types: Events.CommentEventTypes },
        lastKnownPosition: Option.some(lastKnownPosition),
      })

      const all = yield* eventStore.all

      expect(all).toStrictEqual(
        Option.some({ events: [...existingEvents, event], lastKnownPosition: expect.anything() }),
      )
      expect(publish).toHaveBeenCalledWith(event)
    }).pipe(
      Effect.provide(Uuid.layer),
      Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

describe('when the last known position has changed', () => {
  it.prop([fc.array(fc.commentEvent()), fc.commentEvent(), fc.uuid()])('does nothing', (existingEvents, event) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make

      yield* Effect.forEach(existingEvents, existingEvent => eventStore.append(existingEvent))

      const error = yield* Effect.flip(
        eventStore.append(event, {
          filter: { types: Events.CommentEventTypes },
          lastKnownPosition: Option.some(EventStore.Position.make(existingEvents.length - 1)),
        }),
      )

      expect(error).toBeInstanceOf(EventStore.NewEventsFound)

      const all = yield* eventStore.all

      expect(all).toStrictEqual(
        Array.match(existingEvents, {
          onEmpty: Option.none,
          onNonEmpty: events => Option.some({ events, lastKnownEvent: expect.anything() }),
        }),
      )
    }).pipe(
      Effect.provide(Uuid.layer),
      Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
      Effect.provide(Layer.mock(Events.Events, {} as never)),
      Effect.provide(TestLibsqlClient),
      EffectTest.run,
    ),
  )
})

const commentId = Uuid.Uuid('6e0508a5-b227-4bca-b534-7285ec09afff')
const otherCommentId = Uuid.Uuid('2b06c8ae-b1af-478e-8037-7506737e438c')
const datasetReviewId = Uuid.Uuid('2404b8f0-ac79-436d-a452-ba7f1cdab753')
const otherDatasetReviewId = Uuid.Uuid('cce9c7cf-0ed6-4abe-8840-f49a6ca54c6a')

test.each<
  [
    string,
    Events.EventFilter<Types.Tags<Events.Event>>,
    Array.NonEmptyReadonlyArray<Events.Event>,
    ReadonlyArray<Events.Event>,
  ]
>([
  [
    'one type',
    { types: ['CodeOfConductForCommentWasAgreed'] },
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
  ],
  [
    'multiple types',
    { types: ['CodeOfConductForCommentWasAgreed', 'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed'] },
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
  ],
  [
    'other types',
    { types: ['CodeOfConductForCommentWasAgreed'] },
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
    ],
  ],
  [
    'one type and predicate',
    {
      types: ['CodeOfConductForCommentWasAgreed', 'ExistenceOfVerifiedEmailAddressForCommentWasConfirmed'],
      predicates: { commentId },
    },
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
      new Events.CodeOfConductForCommentWasAgreed({ commentId: otherCommentId }),
    ],
    [
      new Events.CodeOfConductForCommentWasAgreed({ commentId }),
      new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
    ],
  ],
  [
    'two types and two predicates',
    {
      types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'AnsweredIfTheDatasetHasEnoughMetadata'],
      predicates: { datasetReviewId, answer: 'yes' },
    },
    [
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'no',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({ datasetReviewId, answer: 'yes', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({ datasetReviewId, answer: 'partly', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId,
        answer: 'yes',
        detail: Option.some(NonEmptyString.NonEmptyString('Some detail')),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({ datasetReviewId, answer: 'partly', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
    ],
    [
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId,
        answer: 'yes',
        detail: Option.some(NonEmptyString.NonEmptyString('Some detail')),
      }),
    ],
  ],
  [
    'multiple filters',
    [
      {
        types: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples', 'AnsweredIfTheDatasetHasEnoughMetadata'],
        predicates: { datasetReviewId, answer: 'yes' },
      },
      {
        types: ['AnsweredIfTheDatasetHasEnoughMetadata'],
        predicates: { datasetReviewId, answer: 'partly' },
      },
    ],
    [
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'no',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({ datasetReviewId, answer: 'yes', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({ datasetReviewId, answer: 'partly', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasTrackedChanges({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId,
        answer: 'yes',
        detail: Option.some(NonEmptyString.NonEmptyString('Some detail')),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({ datasetReviewId, answer: 'partly', detail: Option.none() }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId: otherDatasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
    ],
    [
      new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({
        datasetReviewId,
        answer: 'yes',
        detail: Option.none(),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({
        datasetReviewId,
        answer: 'yes',
        detail: Option.some(NonEmptyString.NonEmptyString('Some detail')),
      }),
      new Events.AnsweredIfTheDatasetHasEnoughMetadata({ datasetReviewId, answer: 'partly', detail: Option.none() }),
    ],
  ],
])('find events (%s)', (_name, filter, events, expected) =>
  Effect.gen(function* () {
    const eventStore = yield* _.make

    yield* Effect.forEach(events, event => eventStore.append(event))

    const actual = yield* eventStore.query(filter)

    expect(actual).toStrictEqual(Option.some({ events: expected, lastKnownEvent: expect.anything() }))
  }).pipe(
    Effect.provide(Uuid.layer),
    Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
    Effect.provide(Layer.mock(Events.Events, {} as never)),
    Effect.provide(TestLibsqlClient),
    EffectTest.run,
  ),
)

test.prop([fc.nonEmptyArray(fc.commentEvent()), fc.nonEmptyArray(fc.commentEvent())])(
  'lists events since',
  (existingEvents, newEvents) =>
    Effect.gen(function* () {
      const eventStore = yield* _.make

      yield* Effect.forEach(existingEvents, existingEvent =>
        TestClock.adjustWith(eventStore.append(existingEvent), '1 milli'),
      )

      const { lastKnownPosition } = yield* Effect.flatten(eventStore.all)

      yield* Effect.forEach(newEvents, newEvent => TestClock.adjustWith(eventStore.append(newEvent), '1 milli'))

      const actual = yield* eventStore.since(lastKnownPosition)

      expect(actual).toStrictEqual(Option.some({ events: newEvents, lastKnownPosition: expect.anything() }))
    }).pipe(
      Effect.provide(Uuid.layer),
      Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
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
