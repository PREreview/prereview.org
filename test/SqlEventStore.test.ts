import { PgClient } from '@effect/sql-pg'
import { Temporal } from '@js-temporal/polyfill'
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
  PubSub,
  Redacted,
  Schema,
  Stream,
  Struct,
} from 'effect'
import { SqlClient } from 'effect/sql'
import { sample } from 'fast-check'
import * as Preprints from '../src/Domain/Preprints/index.ts'
import * as Events from '../src/Events.ts'
import * as EventStore from '../src/EventStore.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'
import * as _ from '../src/SqlEventStore.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../src/types/index.ts'
import * as fc from './fc.ts'
import * as TestLibsqlClient from './TestLibsqlClient.ts'
import * as TestPgClient from './TestPgClient.ts'
import { describe, expect, it } from './vitest.ts'

const now = Temporal.Now.instant()

describe.each<[string, Layer.Layer<SqlClient.SqlClient, unknown>]>([
  ['LibSQL', TestLibsqlClient.layer],
  ['Postgres (PGlite)', TestPgClient.layer],
])('with %s', (_name, TestSqlClient) => {
  it.effect.prop(
    'starts empty',
    [
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
    ],
    ([filter]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        const actual = yield* eventStore.query(filter)
        const all = yield* allEvents(eventStore)

        expect(actual).toStrictEqual(Option.none())
        expect(all).toStrictEqual([])
      }).pipe(
        Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
        Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
        Effect.provide(Layer.mock(Events.Events, {} as never)),
        Effect.provide(TestSqlClient),
      ),
    { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
  )

  describe('when the last known position is none', () => {
    it.effect.prop(
      'appends the event',
      [
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
        fc.array(
          fc.datasetReviewEvent().filter(event => event._tag !== 'InvitationToAppearOnADatasetReviewAddedToTheList'),
        ),
      ],
      ([event, filter, otherEvents]) =>
        Effect.gen(function* () {
          const events = yield* PubSub.unbounded<Events.Event>()
          const published = yield* PubSub.subscribe(events)

          const eventStore = yield* Effect.provide(_.make, Layer.succeed(Events.Events, events))

          yield* Effect.forEach(otherEvents, eventStore.append)

          yield* eventStore.appendIf(event, { filter, lastKnownPosition: Option.none() })

          const actual = yield* eventStore.query({ types: [event._tag], predicates: { commentId: event.commentId } })
          const all = yield* allEvents(eventStore)

          expect(actual).toStrictEqual(Option.some({ events: [event], lastKnownPosition: expect.anything() }))
          expect(all).toStrictEqual([...otherEvents, event])
          expect(yield* PubSub.takeAll(published)).toContainEqual(event)
        }).pipe(
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('when the last known position has not changed', () => {
    it.effect.prop(
      'appends the event',
      [fc.nonEmptyArray(fc.commentEvent()), fc.commentEvent()],
      ([existingEvents, event]) =>
        Effect.gen(function* () {
          const events = yield* PubSub.unbounded<Events.Event>()
          const published = yield* PubSub.subscribe(events)

          const eventStore = yield* Effect.provide(_.make, Layer.succeed(Events.Events, events))

          yield* Effect.forEach(existingEvents, eventStore.append)

          const { lastKnownPosition } = yield* Effect.flatMap(
            eventStore.query({ types: Events.CommentEventTypes }),
            Effect.fromOption,
          )

          yield* eventStore.appendIf(event, {
            filter: { types: Events.CommentEventTypes },
            lastKnownPosition: Option.some(lastKnownPosition),
          })

          const all = yield* allEvents(eventStore)

          expect(all).toStrictEqual([...existingEvents, event])
          expect(yield* PubSub.takeAll(published)).toContainEqual(event)
        }).pipe(
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('when the last known position has changed', () => {
    it.effect.prop(
      'does nothing',
      [fc.array(fc.commentEvent()), fc.commentEvent(), fc.uuid()],
      ([existingEvents, event]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make

          yield* Effect.forEach(existingEvents, eventStore.append)

          const error = yield* Effect.flip(
            eventStore.appendIf(event, {
              filter: { types: Events.CommentEventTypes },
              lastKnownPosition: Option.some(EventStore.Position.make(existingEvents.length - 1)),
            }),
          )

          expect(error).toBeInstanceOf(EventStore.NewEventsFound)

          const all = yield* allEvents(eventStore)

          expect(all).toStrictEqual(existingEvents)
        }).pipe(
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(Layer.mock(Events.Events, {} as never)),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  const commentId = Uuid.Uuid('6e0508a5-b227-4bca-b534-7285ec09afff')
  const otherCommentId = Uuid.Uuid('2b06c8ae-b1af-478e-8037-7506737e438c')
  const datasetReviewId = Uuid.Uuid('2404b8f0-ac79-436d-a452-ba7f1cdab753')
  const otherDatasetReviewId = Uuid.Uuid('cce9c7cf-0ed6-4abe-8840-f49a6ca54c6a')
  const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2024.01.01.12345') })
  const preprintId1Indeterminate = new Preprints.BiorxivOrMedrxivPreprintId({ value: preprintId1.value })
  const preprintId2 = new Preprints.PhilsciPreprintId({ value: 1 })
  const preprintId3 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2024.01.01.67890') })

  it.effect.each<[string, Events.EventFilter, Array.NonEmptyReadonlyArray<Events.Event>, ReadonlyArray<Events.Event>]>([
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
    [
      'complex predicates',
      [
        {
          types: ['ReviewRequestForAPreprintWasStarted'],
          predicates: { preprintId: preprintId1 },
        },
        {
          types: ['ReviewRequestForAPreprintWasStarted'],
          predicates: { preprintId: preprintId2 },
        },
      ],
      [
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: now,
          preprintId: preprintId1,
          reviewRequestId: Uuid.Uuid('2404b8f0-ac79-436d-a452-ba7f1cdab753'),
          requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
        }),
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: now,
          preprintId: preprintId2,
          reviewRequestId: Uuid.Uuid('cce9c7cf-0ed6-4abe-8840-f49a6ca54c6a'),
          requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
        }),
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: now,
          preprintId: preprintId3,
          reviewRequestId: Uuid.Uuid('74300474-a5d8-4fbd-b39d-1e1ff4d65fa7'),
          requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
        }),
      ],
      [
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: now,
          preprintId: preprintId1Indeterminate,
          reviewRequestId: Uuid.Uuid('2404b8f0-ac79-436d-a452-ba7f1cdab753'),
          requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
        }),
        new Events.ReviewRequestForAPreprintWasStarted({
          startedAt: now,
          preprintId: preprintId2,
          reviewRequestId: Uuid.Uuid('cce9c7cf-0ed6-4abe-8840-f49a6ca54c6a'),
          requesterId: OrcidId.OrcidId('0000-0002-1825-0097'),
        }),
      ],
    ],
  ])(
    'find events (%s)',
    ([, filter, events, expected]) =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        yield* Effect.forEach(events, eventStore.append)

        const actual = yield* eventStore.query(filter)

        expect(actual).toStrictEqual(Option.some({ events: expected, lastKnownPosition: expect.anything() }))
      }).pipe(
        Effect.provide(Uuid.layer),
        Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
        Effect.provide(Layer.mock(Events.Events, {} as never)),
        Effect.provide(TestSqlClient),
      ),
    { timeout: Duration.toMillis('60 seconds') },
  )

  describe('all', () => {
    it.effect('streams nothing when there are no events', () =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        const actual = yield* Stream.runCollect(eventStore.all)

        expect(actual).toStrictEqual([])
      }).pipe(
        Effect.provide(Layer.mock(Uuid.GenerateUuid, {})),
        Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
        Effect.provide(Layer.mock(Events.Events, {} as never)),
        Effect.provide(TestSqlClient),
      ),
    )

    it.effect.prop(
      'streams every event',
      [fc.nonEmptyArray(fc.commentEvent())],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make

          yield* Effect.forEach(events, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.all)

          expect(actual).toStrictEqual([{ events, cursor: expect.anything() }])
        }).pipe(
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(Layer.mock(Events.Events, {} as never)),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect.prop(
      'streams many events in pages',
      [fc.array(fc.commentEvent(), { minLength: 7, maxLength: 9 })],
      ([events]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make

          yield* Effect.forEach(events, eventStore.append)

          const pages = yield* Stream.runCollect(eventStore.all)

          expect(Array.map(pages, page => page.events.length)).toStrictEqual([3, 3, events.length - 6])
          expect(Array.flatMap(pages, page => page.events)).toStrictEqual(events)

          const eventsAfterEachPage = yield* Effect.forEach(pages, page =>
            Effect.map(Stream.runCollect(eventStore.since(page.cursor)), Array.flatMap(Struct.get('events'))),
          )

          expect(eventsAfterEachPage).toStrictEqual([Array.drop(events, 3), Array.drop(events, 6), []])
        }).pipe(
          Effect.provide(Layer.succeed(_.PageSize, 3)),
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(Layer.mock(Events.Events, {} as never)),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )
  })

  describe('since', () => {
    it.effect.prop(
      'streams events since a position',
      [fc.nonEmptyArray(fc.commentEvent()), fc.nonEmptyArray(fc.commentEvent())],
      ([existingEvents, newEvents]) =>
        Effect.gen(function* () {
          const eventStore = yield* _.make

          yield* Effect.forEach(existingEvents, eventStore.append)

          const { cursor } = yield* Effect.flatMap(Stream.runLast(eventStore.all), Effect.fromOption)

          yield* Effect.forEach(newEvents, eventStore.append)

          const actual = yield* Stream.runCollect(eventStore.since(cursor))

          expect(actual).toStrictEqual([{ events: newEvents, cursor: expect.anything() }])
        }).pipe(
          Effect.provide(Uuid.layer),
          Effect.provide(Layer.mock(SensitiveDataStore.SensitiveDataStore, {})),
          Effect.provide(Layer.mock(Events.Events, {} as never)),
          Effect.provide(TestSqlClient),
        ),
      { fastCheck: { numRuns: 10 }, timeout: Duration.toMillis('60 seconds') },
    )

    it.effect("fails with a cursor it can't read", () =>
      Effect.gen(function* () {
        const eventStore = yield* _.make

        const actual = yield* Effect.flip(Stream.runCollect(eventStore.since(EventStore.Cursor.make('not a cursor'))))

        expect(actual).toBeInstanceOf(EventStore.FailedToGetEvents)
      }).pipe(
        Effect.provide([
          Uuid.layer,
          Layer.mock(SensitiveDataStore.SensitiveDataStore, {}),
          Layer.mock(Events.Events, {} as never),
          TestSqlClient,
        ]),
      ),
    )
  })
})

describe('on Postgres', () => {
  it.effect('reads events in transaction order', () =>
    Effect.gen(function* () {
      const [laterEvent, earlierEvent] = sample(fc.commentWasStarted(), 2)
      const sql = yield* SqlClient.SqlClient
      const eventStore = yield* _.make

      yield* Effect.forEach(
        [
          [laterEvent!, '10'],
          [earlierEvent!, '9'],
        ] as const,
        Effect.fnUntraced(function* ([event, transactionId]) {
          const { _tag, ...payload } = (yield* Schema.encodeEffect(Events.Event)(event)) as { _tag: string }

          yield* sql`
            INSERT INTO
              events (id, type, payload, transaction_id)
            VALUES
              (
                ${event.commentId},
                ${_tag},
                ${JSON.stringify(payload)},
                ${transactionId}::XID8
              )
          `
        }),
      )

      const actual = yield* allEvents(eventStore)

      expect(actual).toStrictEqual([earlierEvent, laterEvent])
    }).pipe(
      Effect.provide([
        Events.layer,
        Uuid.layer,
        Layer.mock(SensitiveDataStore.SensitiveDataStore, {}),
        TestPgClient.layer,
      ]),
    ),
  )

  it.effect('reads events from before the table was upgraded first', () =>
    Effect.gen(function* () {
      const [legacyEvent, newEvent] = sample(fc.commentWasStarted(), 2)
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

      const { _tag, ...payload } = (yield* Schema.encodeEffect(Events.Event)(legacyEvent!)) as { _tag: string }

      yield* sql`
        INSERT INTO
          events (id, type, payload)
        VALUES
          (
            ${legacyEvent!.commentId},
            ${_tag},
            ${JSON.stringify(payload)}
          )
      `

      const eventStore = yield* _.make

      yield* eventStore.append(newEvent!)

      const actual = yield* allEvents(eventStore)

      expect(actual).toStrictEqual([legacyEvent, newEvent])
    }).pipe(
      Effect.provide([
        Events.layer,
        Uuid.layer,
        Layer.mock(SensitiveDataStore.SensitiveDataStore, {}),
        TestPgClient.layer,
      ]),
    ),
  )
})

describe('on a real Postgres', { skip: process.env['SKIP_CONTAINER_TESTS'] === '1' }, () => {
  it.effect(
    "doesn't skip an event whose transaction commits after a later event",
    () =>
      Effect.gen(function* () {
        const [committedEvent, slowEvent, fastEvent] = sample(fc.commentWasStarted(), 3)
        const sql = yield* SqlClient.SqlClient
        const eventStore = yield* _.make
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

        const { cursor } = yield* Effect.fromOption(Array.last(firstRead))
        const secondRead = yield* Stream.runCollect(eventStore.since(cursor))

        expect(Array.flatMap(firstRead, Struct.get('events'))).toStrictEqual([committedEvent])
        expect(Array.flatMap(secondRead, Struct.get('events'))).toStrictEqual([slowEvent, fastEvent])
      }).pipe(
        Effect.provide([Events.layer, Uuid.layer, Layer.mock(SensitiveDataStore.SensitiveDataStore, {}), RealPgClient]),
      ),
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

const allEvents = (eventStore: EventStore.EventStore) =>
  Effect.map(Stream.runCollect(eventStore.all), Array.flatMap(Struct.get('events')))
