import { Array, Context, Data, Effect, Either, flow, Layer, pipe, Scope } from 'effect'
import type * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import * as DoesAPreprintHaveAReviewRequest from './DoesAPreprintHaveAReviewRequest.ts'
import * as FindReviewRequestsNeedingCategorization from './FindReviewRequestsNeedingCategorization.ts'
import * as GetFiveMostRecentReviewRequests from './GetFiveMostRecentReviewRequests.ts'
import * as GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer from './GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
import * as GetPublishedReviewRequest from './GetPublishedReviewRequest.ts'
import * as GetReceivedReviewRequest from './GetReceivedReviewRequest.ts'
import * as SearchForPublishedReviewRequests from './SearchForPublishedReviewRequests.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    doesAPreprintHaveAReviewRequest: Query<
      (input: DoesAPreprintHaveAReviewRequest.Input) => DoesAPreprintHaveAReviewRequest.Result
    >
    getFiveMostRecentReviewRequests: SimpleQuery<GetFiveMostRecentReviewRequests.Result>
    getReceivedReviewRequest: Query<(input: GetReceivedReviewRequest.Input) => GetReceivedReviewRequest.Result>
    getPublishedReviewRequest: Query<(input: GetPublishedReviewRequest.Input) => GetPublishedReviewRequest.Result>
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: Query<
      (
        input: GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Input,
      ) => GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Result
    >
    searchForPublishedReviewRequests: Query<
      (input: SearchForPublishedReviewRequests.Input) => SearchForPublishedReviewRequests.Result
    >
    findReviewRequestsNeedingCategorization: SimpleQuery<FindReviewRequestsNeedingCategorization.Result>
  }
>() {}

type Query<F extends (...args: never) => unknown, E = never> = (
  ...args: Parameters<F>
) => ReturnType<F> extends Either.Either<infer R, infer L>
  ? Effect.Effect<R, UnableToQuery | E | L>
  : Effect.Effect<ReturnType<F>, UnableToQuery | E>

type SimpleQuery<F> = () => Effect.Effect<F, UnableToQuery>

export class UnableToQuery extends Data.TaggedError('UnableToQuery')<{ cause?: unknown }> {}

export const {
  doesAPreprintHaveAReviewRequest,
  getFiveMostRecentReviewRequests,
  getReceivedReviewRequest,
  getPublishedReviewRequest,
  getPreprintsWithARecentReviewRequestsMatchingAPrereviewer,
  searchForPublishedReviewRequests,
  findReviewRequestsNeedingCategorization,
} = Effect.serviceFunctions(ReviewRequestQueries)

export type { RecentReviewRequest } from './GetFiveMostRecentReviewRequests.ts'
export type { RecentReviewRequestMatchingAPrereviewer } from './GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
export type { PublishedReviewRequest } from './GetPublishedReviewRequest.ts'
export type { ReceivedReviewRequest } from './GetReceivedReviewRequest.ts'

const makeReviewRequestQueries: Effect.Effect<typeof ReviewRequestQueries.Service, never, EventStore.EventStore> =
  Effect.gen(function* () {
    const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

    const handleQuery = <Event extends Events.Event['_tag'], Input, Result, Error>(
      name: string,
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

          return yield* pipe(
            Effect.suspend(() => query(events, input)),
            Effect.withSpan(name),
          )
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      )

    const handleSimpleQuery = <Event extends Events.ReviewRequestEvent['_tag'], Result>(
      name: string,
      filter: Events.EventFilter<Event>,
      query: (events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>) => Result,
    ): (() => Effect.Effect<Result, UnableToQuery>) =>
      Effect.fn(
        function* () {
          const { events } = yield* pipe(
            EventStore.query(filter),
            Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
          )

          return yield* pipe(
            Effect.sync(() => query(events)),
            Effect.withSpan(name),
          )
        },
        Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
        Effect.provide(context),
      )

    return {
      doesAPreprintHaveAReviewRequest: handleQuery(
        'DoesAPreprintHaveAReviewRequest',
        DoesAPreprintHaveAReviewRequest.createFilter,
        flow(DoesAPreprintHaveAReviewRequest.query, Either.right),
      ),
      getFiveMostRecentReviewRequests: handleSimpleQuery(
        'GetFiveMostRecentReviewRequests',
        GetFiveMostRecentReviewRequests.filter,
        GetFiveMostRecentReviewRequests.query,
      ),
      getReceivedReviewRequest: handleQuery(
        'GetReceivedReviewRequest',
        GetReceivedReviewRequest.createFilter,
        GetReceivedReviewRequest.query,
      ),
      getPublishedReviewRequest: handleQuery(
        'GetPublishedReviewRequest',
        GetPublishedReviewRequest.createFilter,
        GetPublishedReviewRequest.query,
      ),
      getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: handleQuery(
        'GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer',
        GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.createFilter,
        flow(GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.query, Either.right),
      ),
      searchForPublishedReviewRequests: handleQuery(
        'SearchForPublishedReviewRequests',
        SearchForPublishedReviewRequests.createFilter,
        SearchForPublishedReviewRequests.query,
      ),
      findReviewRequestsNeedingCategorization: handleSimpleQuery(
        'FindReviewRequestsNeedingCategorization',
        FindReviewRequestsNeedingCategorization.filter,
        FindReviewRequestsNeedingCategorization.query,
      ),
    }
  })

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
