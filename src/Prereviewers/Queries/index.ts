import { Array, Context, Data, Effect, Layer, pipe, Scope } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import * as GetSubscribedKeywords from './GetSubscribedKeywords.ts'

export class PrereviewerQueries extends Context.Tag('PrereviewerQueries')<
  PrereviewerQueries,
  {
    getSubscribedKeywords: Query<(input: GetSubscribedKeywords.Input) => GetSubscribedKeywords.Result>
  }
>() {}

type Query<F extends (...args: never) => unknown> = (
  ...args: Parameters<F>
) => Effect.Effect<ReturnType<F>, UnableToQuery>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const { getSubscribedKeywords } = Effect.serviceFunctions(PrereviewerQueries)

const makePrereviewerQueries: Effect.Effect<typeof PrereviewerQueries.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleQuery = <Event extends Events.PrereviewerEvent['_tag'], Input, Result>(
      createFilter: (input: Input) => Events.EventFilter<Event>,
      query: (events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>, input: Input) => Result,
    ): ((input: Input) => Effect.Effect<Result, UnableToQuery>) =>
      Effect.fn(
        function* (input) {
          const filter = createFilter(input)

          const { events } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
          )

          return query(events, input)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      )

    return {
      getSubscribedKeywords: handleQuery(GetSubscribedKeywords.createFilter, GetSubscribedKeywords.query),
    }
  })

export const queriesLayer = Layer.effect(PrereviewerQueries, makePrereviewerQueries)
