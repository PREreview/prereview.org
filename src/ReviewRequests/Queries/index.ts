import { Array, Console, Context, Data, Effect, Either, flow, Layer, pipe, PubSub, Queue, Scope } from 'effect'
import * as EventDispatcher from '../../EventDispatcher.ts'
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
export {
  PublishedPrereviewerReviewRequest,
  PublishedReceivedReviewRequest,
  type PublishedReviewRequest,
} from './GetPublishedReviewRequest.ts'
export type { ReceivedReviewRequest } from './GetReceivedReviewRequest.ts'

const makeReviewRequestQueries: Effect.Effect<
  typeof ReviewRequestQueries.Service,
  never,
  EventStore.EventStore | EventDispatcher.EventsForQueries | Scope.Scope
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  const handleQuery = <Event extends Events.Event['_tag'], Input, Result, Error>(
    name: string,
    createFilter: (input: Input) => Events.EventFilter<Event>,
    query: (
      events: ReadonlyArray<Extract<Events.Event, { _tag: Event }>>,
      input: Input,
    ) => Either.Either<Result, Error>,
  ): ((input: Input) => Effect.Effect<Result, UnableToQuery | Error>) =>
    Effect.fn(`ReviewRequestQueries.${name}`)(
      function* (input) {
        const filter = createFilter(input)

        const { events } = yield* pipe(
          EventStore.query(filter),
          Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
        )

        return yield* pipe(
          Effect.suspend(() => query(events, input)),
          Effect.withSpan('query'),
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
    Effect.fn(`ReviewRequestQueries.${name}`)(
      function* () {
        const { events } = yield* pipe(
          EventStore.query(filter),
          Effect.catchTag('NoEventsFound', () => Effect.succeed({ events: Array.empty() })),
        )

        return yield* pipe(
          Effect.sync(() => query(events)),
          Effect.withSpan('query'),
        )
      },
      Effect.catchTag('FailedToGetEvents', cause => new UnableToQuery({ cause })),
      Effect.provide(context),
    )

  const eventsForQueries = yield* EventDispatcher.EventsForQueries
  const dequeue = yield* PubSub.subscribe(eventsForQueries)

  yield* pipe(
    Queue.take(dequeue),
    Effect.andThen(event => Console.log(event._tag)),
    Effect.forever,
    Effect.fork,
  )

  return {
    doesAPreprintHaveAReviewRequest: handleQuery(
      'doesAPreprintHaveAReviewRequest',
      DoesAPreprintHaveAReviewRequest.createFilter,
      flow(DoesAPreprintHaveAReviewRequest.query, Either.right),
    ),
    getFiveMostRecentReviewRequests: handleSimpleQuery(
      'getFiveMostRecentReviewRequests',
      GetFiveMostRecentReviewRequests.filter,
      GetFiveMostRecentReviewRequests.query,
    ),
    getReceivedReviewRequest: handleQuery(
      'getReceivedReviewRequest',
      GetReceivedReviewRequest.createFilter,
      GetReceivedReviewRequest.query,
    ),
    getPublishedReviewRequest: handleQuery(
      'getPublishedReviewRequest',
      GetPublishedReviewRequest.createFilter,
      GetPublishedReviewRequest.query,
    ),
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: handleQuery(
      'getPreprintsWithARecentReviewRequestsMatchingAPrereviewer',
      GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.createFilter,
      flow(GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.query, Either.right),
    ),
    searchForPublishedReviewRequests: handleQuery(
      'searchForPublishedReviewRequests',
      SearchForPublishedReviewRequests.createFilter,
      SearchForPublishedReviewRequests.query,
    ),
    findReviewRequestsNeedingCategorization: handleSimpleQuery(
      'findReviewRequestsNeedingCategorization',
      FindReviewRequestsNeedingCategorization.filter,
      FindReviewRequestsNeedingCategorization.query,
    ),
  }
})

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
