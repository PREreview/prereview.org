import { Array, Context, Data, Effect, Layer, Option, pipe, Ref, Schedule, Stream, Struct } from 'effect'
import type { AnyEvent } from './EventFilter.ts'
import type * as EventStore from './EventStore.ts'

export type Subscriber<E extends AnyEvent> = (events: Array.NonEmptyReadonlyArray<E>) => Effect.Effect<void>

export class RegisteredAfterReplay extends Data.TaggedError('RegisteredAfterReplay') {}

export interface StatefulQueries<E extends AnyEvent> {
  readonly register: (subscriber: Subscriber<E>) => Effect.Effect<void>
}

export const make = <E extends AnyEvent, R>(
  tag: Context.Service<StatefulQueries<E>, StatefulQueries<E>>,
  eventStore: Effect.Effect<EventStore.EventStore<E>, never, R>,
) => {
  const LastCursor = Context.Service<Ref.Ref<Option.Option<EventStore.Cursor>>>(`${tag.key}/LastCursor`)

  const Subscribers = Context.Service<Ref.Ref<ReadonlyArray<Subscriber<E>>>>(`${tag.key}/Subscribers`)

  const HasReplayed = Context.Service<Ref.Ref<boolean>>(`${tag.key}/HasReplayed`)

  const layer = Layer.mergeAll(
    Layer.provideMerge(
      Layer.effect(
        tag,
        Effect.gen(function* () {
          const subscribers = yield* Subscribers
          const hasReplayed = yield* HasReplayed

          return {
            register: Effect.fnUntraced(function* (subscriber) {
              if (yield* Ref.get(hasReplayed)) {
                return yield* Effect.die(new RegisteredAfterReplay())
              }

              yield* Ref.update(subscribers, Array.append(subscriber))
            }),
          }
        }),
      ),
      Layer.mergeAll(
        Layer.effect(Subscribers, Ref.make([] as ReadonlyArray<Subscriber<E>>)),
        Layer.effect(HasReplayed, Ref.make(false)),
      ),
    ),
    Layer.effect(LastCursor, Ref.make(Option.none())),
  )

  const updateWithPage = Effect.fn('StatefulQueries.updateWithPage')(function* (page: EventStore.Page<E>) {
    const lastCursor = yield* LastCursor
    const subscribers = yield* Subscribers
    const allSubscribers = yield* Ref.get(subscribers)
    const events = Array.map(page, Struct.get('event'))

    yield* Effect.forEach(
      allSubscribers,
      subscriber =>
        Effect.catchDefect(subscriber(events), defect =>
          pipe(
            Ref.update(
              subscribers,
              Array.filter(other => other !== subscriber),
            ),
            Effect.andThen(
              Effect.annotateLogs(Effect.logError('Stateful query failed to update, so no longer updating it'), {
                defect,
              }),
            ),
          ),
        ),
      { discard: true, concurrency: 'unbounded' },
    )

    yield* Ref.set(lastCursor, Option.some(Array.lastNonEmpty(page).cursor))
  })

  const updateWithExistingEvents = Effect.gen(function* () {
    const lastCursor = yield* LastCursor
    const store = yield* eventStore

    yield* Ref.set(yield* HasReplayed, true)

    yield* Stream.runForEach(
      Option.match(yield* Ref.get(lastCursor), {
        onNone: () => store.all,
        onSome: store.since,
      }),
      updateWithPage,
    )
  }).pipe(Effect.withSpan('StatefulQueries.replay'))

  const updateWithNewEvents = Effect.gen(function* () {
    const lastCursor = yield* LastCursor
    const store = yield* eventStore

    yield* Stream.runForEach(
      store.subscribe({ after: Option.getOrUndefined(yield* Ref.get(lastCursor)) }),
      updateWithPage,
    )
  })

  const worker = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.gen(function* () {
        yield* pipe(
          updateWithNewEvents,
          Effect.tapError(error =>
            Effect.annotateLogs(Effect.logError('Unable to update stateful queries with new events'), { error }),
          ),
          Effect.retry(Schedule.spaced('2 seconds')),
          Effect.forkScoped,
        )

        yield* Effect.logDebug('StatefulQueries worker started')
      }),
      () => Effect.logDebug('StatefulQueries worker stopped'),
      { interruptible: true },
    ),
  )

  const replay = pipe(
    Effect.logDebug('Replaying existing events'),
    Effect.andThen(updateWithExistingEvents),
    Effect.timeout('20 seconds'),
    Effect.tap(() => Effect.logDebug('Existing events replayed')),
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to replay existing events'), { error })),
  )

  return { layer, worker, replay }
}
