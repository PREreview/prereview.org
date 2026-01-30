import { Context, Effect, Either, flow, Layer, Scope } from 'effect'
import type * as EventDispatcher from '../../EventDispatcher.ts'
import type * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
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
    doesAPreprintHaveAReviewRequest: Queries.FromStatefulQuery<
      typeof DoesAPreprintHaveAReviewRequest.doesAPreprintHaveAReviewRequest
    >
    getFiveMostRecentReviewRequests: Queries.FromStatefulQuery<
      typeof GetFiveMostRecentReviewRequests.getFiveMostRecentReviewRequests
    >
    getReceivedReviewRequest: Queries.Query<(input: GetReceivedReviewRequest.Input) => GetReceivedReviewRequest.Result>
    getPublishedReviewRequest: Queries.Query<
      (input: GetPublishedReviewRequest.Input) => GetPublishedReviewRequest.Result
    >
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: Queries.Query<
      (
        input: GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Input,
      ) => GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Result
    >
    searchForPublishedReviewRequests: Queries.FromStatefulQuery<
      typeof SearchForPublishedReviewRequests.searchForPublishedReviewRequests
    >
    findReviewRequestsNeedingCategorization: Queries.SimpleQuery<FindReviewRequestsNeedingCategorization.Result>
  }
>() {}

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
  EventStore.EventStore | EventDispatcher.EventDispatcher
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<EventStore.EventStore>(), Context.omit(Scope.Scope))

  return {
    doesAPreprintHaveAReviewRequest: yield* Queries.makeStatefulQuery(
      DoesAPreprintHaveAReviewRequest.doesAPreprintHaveAReviewRequest,
    ),
    getFiveMostRecentReviewRequests: yield* Queries.makeStatefulQuery(
      GetFiveMostRecentReviewRequests.getFiveMostRecentReviewRequests,
    ),
    getReceivedReviewRequest: flow(
      Queries.handleQuery(
        'ReviewRequestQueries.getReceivedReviewRequest',
        GetReceivedReviewRequest.createFilter,
        GetReceivedReviewRequest.query,
      ),
      Effect.provide(context),
    ),
    getPublishedReviewRequest: flow(
      Queries.handleQuery(
        'ReviewRequestQueries.getPublishedReviewRequest',
        GetPublishedReviewRequest.createFilter,
        GetPublishedReviewRequest.query,
      ),
      Effect.provide(context),
    ),
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: flow(
      Queries.handleQuery(
        'ReviewRequestQueries.getPreprintsWithARecentReviewRequestsMatchingAPrereviewer',
        GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.createFilter,
        flow(GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.query, Either.right),
      ),
      Effect.provide(context),
    ),
    searchForPublishedReviewRequests: yield* Queries.makeStatefulQuery(
      SearchForPublishedReviewRequests.searchForPublishedReviewRequests,
    ),
    findReviewRequestsNeedingCategorization: flow(
      Queries.handleSimpleQuery(
        'ReviewRequestQueries.findReviewRequestsNeedingCategorization',
        FindReviewRequestsNeedingCategorization.filter,
        FindReviewRequestsNeedingCategorization.query,
      ),
      Effect.provide(context),
    ),
  }
})

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
