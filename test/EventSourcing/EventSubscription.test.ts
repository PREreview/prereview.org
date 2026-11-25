import {
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Logger,
  Option,
  pipe,
  Queue,
  Ref,
  References,
  Scope,
  type Types,
} from 'effect'
import { TestClock } from 'effect/testing'
import { sample } from 'fast-check'
import * as Events from '../../src/Domain/Events/Events.ts'
import * as EventStore from '../../src/Domain/Events/EventStore.ts'
import * as _ from '../../src/EventSourcing/EventSubscription.ts'
import * as SqlEventStore from '../../src/EventSourcing/SqlEventStore.ts'
import * as SensitiveDataStore from '../../src/SensitiveData/SensitiveDataStore.ts'
import { Uuid } from '../../src/types/index.ts'
import * as fc from '../fc.ts'
import * as TestLibsqlClient from '../TestLibsqlClient.ts'
import { describe, expect, it } from '../vitest.ts'

describe('EventSubscription', () => {
  it.effect('handles events appended after it starts', () =>
    Effect.gen(function* () {
      const [startedEvent] = sample(fc.commentWasStarted(), 1)
      const [publishedEvent] = sample(fc.commentWasPublished(), 1)
      const handled = yield* Queue.unbounded<Events.Event>()

      yield* start('test', {
        CommentWasStarted: event => Queue.offer(handled, event),
        CommentWasPublished: event => Queue.offer(handled, event),
      })

      yield* EventStore.append(startedEvent!)
      yield* EventStore.append(publishedEvent!)

      const actual = yield* Queue.takeN(handled, 2)

      expect(actual).toStrictEqual([startedEvent, publishedEvent])
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('skips events without a handler', () =>
    Effect.gen(function* () {
      const [publishedEvent] = sample(fc.commentWasPublished(), 1)
      const [startedEvent] = sample(fc.commentWasStarted(), 1)
      const handled = yield* Queue.unbounded<Events.Event>()

      yield* start('test', { CommentWasStarted: event => Queue.offer(handled, event) })

      yield* EventStore.append(publishedEvent!)
      yield* EventStore.append(startedEvent!)

      const actual = yield* Queue.take(handled)

      expect(actual).toStrictEqual(startedEvent)
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('ignores events appended before it first starts', () =>
    Effect.gen(function* () {
      const [earlierEvent, laterEvent] = sample(fc.commentWasStarted(), 2)
      const handled = yield* Queue.unbounded<Events.Event>()

      yield* EventStore.append(earlierEvent!)

      yield* start('test', { CommentWasStarted: event => Queue.offer(handled, event) })

      yield* EventStore.append(laterEvent!)

      const actual = yield* Queue.take(handled)

      expect(actual).toStrictEqual(laterEvent)
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('resumes from where it stopped', () =>
    Effect.gen(function* () {
      const [handledEvent, missedEvent] = sample(fc.commentWasStarted(), 2)
      const handled = yield* Queue.unbounded<Events.Event>()

      const firstRun = yield* Scope.make()
      yield* pipe(start('test', { CommentWasStarted: event => Queue.offer(handled, event) }), Scope.provide(firstRun))
      yield* EventStore.append(handledEvent!)
      const firstRunHandled = yield* Queue.take(handled)
      yield* Scope.close(firstRun, Exit.void)

      yield* EventStore.append(missedEvent!)

      yield* start('test', { CommentWasStarted: event => Queue.offer(handled, event) })

      const secondRunHandled = yield* Queue.take(handled)

      expect([firstRunHandled, secondRunHandled]).toStrictEqual([handledEvent, missedEvent])
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('resumes from where it first started when it stopped before handling anything', () =>
    Effect.gen(function* () {
      const [missedEvent] = sample(fc.commentWasStarted(), 1)
      const handled = yield* Queue.unbounded<Events.Event>()

      const firstRun = yield* Scope.make()
      yield* pipe(start('test', { CommentWasStarted: event => Queue.offer(handled, event) }), Scope.provide(firstRun))
      yield* Scope.close(firstRun, Exit.void)

      yield* EventStore.append(missedEvent!)

      yield* start('test', { CommentWasStarted: event => Queue.offer(handled, event) })

      const actual = yield* Queue.take(handled)

      expect(actual).toStrictEqual(missedEvent)
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('retries an event that fails', () =>
    Effect.gen(function* () {
      const [event] = sample(fc.commentWasStarted(), 1)
      const attempts = yield* Ref.make(0)
      const failed = yield* Deferred.make<undefined>()
      const handled = yield* Queue.unbounded<Events.Event>()

      yield* start('test', {
        CommentWasStarted: event =>
          pipe(
            Ref.updateAndGet(attempts, attempt => attempt + 1),
            Effect.andThen(attempt =>
              attempt === 1
                ? pipe(Deferred.succeed(failed, undefined), Effect.andThen(Effect.fail('failed')))
                : Queue.offer(handled, event),
            ),
          ),
      })

      yield* EventStore.append(event!)
      yield* Deferred.await(failed)
      yield* TestClock.adjust('2 seconds')

      const actual = yield* Queue.take(handled)

      expect(actual).toStrictEqual(event)
      expect(yield* Ref.get(attempts)).toStrictEqual(2)
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect("doesn't repeat events it handled before one that fails", () =>
    Effect.gen(function* () {
      const [triggerEvent, firstEvent, failingEvent, lastEvent] = sample(fc.commentWasStarted(), 4)
      const attempted = yield* Queue.unbounded<Events.Event>()
      const release = yield* Deferred.make<undefined>()
      const failed = yield* Deferred.make<undefined>()
      const hasFailed = yield* Ref.make(false)

      yield* start('test', {
        CommentWasStarted: event =>
          Effect.gen(function* () {
            yield* Queue.offer(attempted, event)

            if (event.commentId === triggerEvent!.commentId) {
              yield* Deferred.await(release)
            }

            if (event.commentId === failingEvent!.commentId && !(yield* Ref.getAndSet(hasFailed, true))) {
              yield* Deferred.succeed(failed, undefined)
              return yield* Effect.fail('failed')
            }
          }),
      })

      yield* EventStore.append(triggerEvent!)
      yield* Queue.take(attempted)
      yield* Effect.forEach([firstEvent!, failingEvent!, lastEvent!], EventStore.append)
      yield* Deferred.succeed(release, undefined)
      yield* Deferred.await(failed)
      yield* TestClock.adjust('2 seconds')

      const actual = yield* Queue.takeN(attempted, 4)

      expect(actual).toStrictEqual([firstEvent, failingEvent, failingEvent, lastEvent])
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('retries an event whose handler throws', () =>
    Effect.gen(function* () {
      const [event] = sample(fc.commentWasStarted(), 1)
      const attempts = yield* Ref.make(0)
      const threw = yield* Deferred.make<undefined>()
      const handled = yield* Queue.unbounded<Events.Event>()

      yield* start('test', {
        CommentWasStarted: event =>
          pipe(
            Ref.updateAndGet(attempts, attempt => attempt + 1),
            Effect.andThen(attempt =>
              attempt === 1
                ? pipe(
                    Deferred.succeed(threw, undefined),
                    Effect.andThen(
                      Effect.sync(() => {
                        throw new Error('thrown')
                      }),
                    ),
                  )
                : Queue.offer(handled, event),
            ),
          ),
      })

      yield* EventStore.append(event!)
      yield* Deferred.await(threw)
      yield* TestClock.adjust('2 seconds')

      const actual = yield* Queue.take(handled)

      expect(actual).toStrictEqual(event)
      expect(yield* Ref.get(attempts)).toStrictEqual(2)
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  )

  it.effect('logs where it is stuck and when it recovers', () =>
    Effect.gen(function* () {
      const [event] = sample(fc.commentWasStarted(), 1)
      const attempts = yield* Ref.make(0)
      const failed = yield* Deferred.make<undefined>()
      const recovered = yield* Deferred.make<undefined>()
      const logs: Array<{ message: unknown; annotations: Readonly<Record<string, unknown>> }> = []

      const capturingLogger = Logger.make(({ message, fiber }) => {
        const annotations = fiber.getRef(References.CurrentLogAnnotations)
        logs.push({ message, annotations })

        if (globalThis.Array.isArray(message) && message[0] === 'EventSubscription recovered') {
          Deferred.doneUnsafe(recovered, Effect.succeed(undefined))
        }
      })

      const [stuckCursor, recoveredCursor] = yield* Effect.gen(function* () {
        const stuckCursor = yield* EventStore.latestCursor

        yield* start('test', {
          CommentWasStarted: () =>
            pipe(
              Ref.updateAndGet(attempts, attempt => attempt + 1),
              Effect.andThen(attempt =>
                attempt === 1
                  ? pipe(Deferred.succeed(failed, undefined), Effect.andThen(Effect.fail('failed')))
                  : Effect.void,
              ),
            ),
        })

        yield* EventStore.append(event!)
        yield* Deferred.await(failed)
        yield* TestClock.adjust('2 seconds')
        yield* Deferred.await(recovered)

        return [stuckCursor, yield* EventStore.latestCursor] as const
      }).pipe(Effect.provide([TestLayer, Logger.layer([capturingLogger])]))

      expect(logs).toContainEqual({
        message: ['EventSubscription failed'],
        annotations: expect.objectContaining({ name: 'test', cursor: stuckCursor, attempt: 1, failingForMs: 0 }),
      })
      expect(logs).toContainEqual({
        message: ['EventSubscription recovered'],
        annotations: expect.objectContaining({ name: 'test', cursor: recoveredCursor, failingForMs: 2000 }),
      })
    }).pipe(Effect.scoped),
  )

  it.effect('retries starting when it fails', () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0)
      const failed = yield* Deferred.make<undefined>()

      yield* Effect.gen(function* () {
        const starting = yield* Effect.forkScoped(_.subscribe('test', { CommentWasStarted: () => Effect.void }))

        yield* Deferred.await(failed)
        yield* TestClock.adjust('2 seconds')

        const actual = yield* Effect.exit(Fiber.join(starting))

        expect(actual._tag).toStrictEqual('Success')
        expect(yield* Ref.get(attempts)).toStrictEqual(2)
      }).pipe(
        Effect.provide([
          Layer.mock(EventStore.EventStore, {
            loadCheckpoint: () =>
              pipe(
                Ref.updateAndGet(attempts, attempt => attempt + 1),
                Effect.andThen(attempt =>
                  attempt === 1
                    ? pipe(
                        Deferred.succeed(failed, undefined),
                        Effect.andThen(new EventStore.FailedToLoadCheckpoint({})),
                      )
                    : Effect.succeed(Option.some(EventStore.Cursor.make('cursor'))),
                ),
              ),
          }),
        ]),
      )
    }).pipe(Effect.scoped),
  )
})

const start = <Handlers extends Types.NoExcessProperties<_.Handlers, Handlers>>(name: string, handlers: Handlers) =>
  pipe(_.subscribe(name, handlers), Effect.andThen(Effect.forkScoped))

const TestLayer = pipe(
  SqlEventStore.layer(Events.Event),
  Layer.provideMerge(
    Layer.mergeAll(Uuid.layer, Layer.mock(SensitiveDataStore.SensitiveDataStore, {}), TestLibsqlClient.layer),
  ),
)
