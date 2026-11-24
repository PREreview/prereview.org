import { Array, Data, Effect, Option, pipe, Record, Ref, Schedule, Stream, type Types } from 'effect'
import { Singleton } from 'effect/cluster'
import type * as Events from '../Events.ts'
import { Temporal } from '../types/index.ts'
import * as EventStore from './EventStore.ts'

export type Handlers = {
  readonly [Tag in Events.Event['_tag']]?: (
    event: Types.ExtractTag<Events.Event, Tag>,
  ) => Effect.Effect<unknown, unknown, unknown>
}

type HandlerServices<H extends Handlers> = Effect.Services<ReturnType<Extract<H[keyof H], (event: never) => unknown>>>

class HandlerDefect extends Data.TaggedError('HandlerDefect')<{ cause: unknown }> {}

const backoff = Schedule.min([Schedule.exponential('2 seconds'), Schedule.spaced('5 minutes')])

export const subscribe = Effect.fnUntraced(function* <H extends Types.NoExcessProperties<Handlers, H>>(
  name: string,
  handlers: H,
) {
  const handle = (event: Events.Event): Effect.Effect<void, unknown, HandlerServices<H>> => {
    const handler = handlers[event._tag] as
      ((event: Events.Event) => Effect.Effect<unknown, unknown, HandlerServices<H>>) | undefined

    if (handler === undefined) {
      return Effect.void
    }

    return pipe(
      handler(event),
      Effect.asVoid,
      Effect.catchDefect(cause => new HandlerDefect({ cause })),
    )
  }

  const lastCursor = yield* pipe(
    EventStore.loadCheckpoint(name),
    Effect.flatMap(
      Option.match({
        onSome: Effect.succeed,
        onNone: () =>
          pipe(
            EventStore.latestCursor,
            Effect.tap(cursor => EventStore.saveCheckpoint(name, cursor)),
          ),
      }),
    ),
    Effect.andThen(Ref.make),
    Effect.withSpan('EventSubscription.start', { attributes: { name } }),
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('EventSubscription failed to start'), { error, name }),
    ),
    Effect.retry({ schedule: backoff }),
  )

  const saveCursor = (cursor: EventStore.Cursor) =>
    pipe(EventStore.saveCheckpoint(name, cursor), Effect.andThen(Ref.set(lastCursor, cursor)))

  const types = Record.keys(handlers) as Array<Events.Event['_tag']>

  const failures = yield* Ref.make<Option.Option<{ readonly since: Temporal.Instant; readonly attempts: number }>>(
    Option.none(),
  )

  const recordFailure = Effect.fnUntraced(function* (error: unknown) {
    const now = yield* Temporal.currentInstant
    const { since, attempts } = yield* Ref.updateAndGet(
      failures,
      Option.match({
        onNone: () => Option.some({ since: now, attempts: 1 }),
        onSome: ({ since, attempts }) => Option.some({ since, attempts: attempts + 1 }),
      }),
    ).pipe(Effect.map(Option.getOrThrow))

    yield* Effect.annotateLogs(Effect.logError('EventSubscription failed'), {
      error,
      name,
      cursor: yield* Ref.get(lastCursor),
      attempt: attempts,
      failingForMs: since.until(now).total('milliseconds'),
    })
  })

  const recordSuccess = Effect.gen(function* () {
    const previousFailures = yield* Ref.getAndSet(failures, Option.none())

    if (Option.isNone(previousFailures)) {
      return
    }

    const now = yield* Temporal.currentInstant

    yield* Effect.annotateLogs(Effect.logInfo('EventSubscription recovered'), {
      name,
      cursor: yield* Ref.get(lastCursor),
      failingForMs: previousFailures.value.since.until(now).total('milliseconds'),
    })
  })

  const handlePage = (page: EventStore.Page) =>
    pipe(
      Effect.forEach(
        page,
        ({ event }, index) =>
          pipe(
            handle(event),
            Effect.tapError(() =>
              Option.match(Array.get(page, index - 1), {
                onNone: () => Effect.void,
                onSome: ({ cursor }) => saveCursor(cursor),
              }),
            ),
          ),
        { discard: true },
      ),
      Effect.andThen(saveCursor(Array.lastNonEmpty(page).cursor)),
      Effect.tap(recordSuccess),
      Effect.withSpan('EventSubscription.handlePage', {
        attributes: { name, eventsHandled: page.length, endCursor: Array.lastNonEmpty(page).cursor },
      }),
    )

  const handleNewEvents = Effect.gen(function* () {
    if (!Array.isReadonlyArrayNonEmpty(types)) {
      return yield* Effect.never
    }

    const startCursor = yield* Ref.get(lastCursor)

    yield* Stream.runForEach(EventStore.subscribe({ after: startCursor, filter: { types } }), handlePage)
  })

  yield* Effect.logDebug('EventSubscription started').pipe(Effect.annotateLogs({ name }))

  return pipe(handleNewEvents, Effect.tapError(recordFailure), Effect.retry({ schedule: backoff }))
})

export const make = <H extends Types.NoExcessProperties<Handlers, H>>(name: string, handlers: H) =>
  Singleton.make(`EventSubscription/${name}`, Effect.flatten(subscribe(name, handlers)))
