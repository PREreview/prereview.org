import { Array, Context, Data, Effect, type Either, Layer, pipe } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import * as GetPublishedReviewRequest from './GetPublishedReviewRequest.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    getPublishedReviewRequest: Query<(input: GetPublishedReviewRequest.Input) => GetPublishedReviewRequest.Result>
  }
>() {}

type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | L>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const { getPublishedReviewRequest } = Effect.serviceFunctions(ReviewRequestQueries)

export type { PublishedReviewRequest } from './GetPublishedReviewRequest.ts'

const makeReviewRequestQueries: Effect.Effect<typeof ReviewRequestQueries.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.context<EventStore.EventStore>()

    const handleQuery = <Event extends Events.ReviewRequestEvent['_tag'], Input, Result, Error>(
      createFilter: (input: Input) => Events.EventFilter<Event>,
      query: (
        events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>,
        input: Input,
      ) => Either.Either<Result, Error>,
    ): ((input: Input) => Effect.Effect<Result, UnableToQuery | Error>) =>
      Effect.fn(
        function* (input) {
          const filter = createFilter(input)

          const { events } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
          )

          return yield* query(events, input)
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      )

    return {
      getPublishedReviewRequest: handleQuery(GetPublishedReviewRequest.createFilter, GetPublishedReviewRequest.query),
    }
  })

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
