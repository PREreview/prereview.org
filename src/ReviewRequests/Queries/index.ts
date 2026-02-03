import { Context, Effect, Either, flow, Layer } from 'effect'
import type * as EventDispatcher from '../../EventDispatcher.ts'
import type * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
import { DoesAPreprintHaveAReviewRequest } from './DoesAPreprintHaveAReviewRequest.ts'
import * as FindReviewRequestsNeedingCategorization from './FindReviewRequestsNeedingCategorization.ts'
import { GetFiveMostRecentReviewRequests } from './GetFiveMostRecentReviewRequests.ts'
import * as GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer from './GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
import * as GetPublishedReviewRequest from './GetPublishedReviewRequest.ts'
import * as GetReceivedReviewRequest from './GetReceivedReviewRequest.ts'
import { SearchForPublishedReviewRequests } from './SearchForPublishedReviewRequests.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    doesAPreprintHaveAReviewRequest: Queries.FromStatefulQuery<typeof DoesAPreprintHaveAReviewRequest>
    getFiveMostRecentReviewRequests: Queries.FromStatefulQuery<typeof GetFiveMostRecentReviewRequests>
    getReceivedReviewRequest: Queries.Query<(input: GetReceivedReviewRequest.Input) => GetReceivedReviewRequest.Result>
    getPublishedReviewRequest: Queries.Query<
      (input: GetPublishedReviewRequest.Input) => GetPublishedReviewRequest.Result
    >
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: Queries.Query<
      (
        input: GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Input,
      ) => GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.Result
    >
    searchForPublishedReviewRequests: Queries.FromStatefulQuery<typeof SearchForPublishedReviewRequests>
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
  return {
    doesAPreprintHaveAReviewRequest: yield* Queries.makeStatefulQuery(DoesAPreprintHaveAReviewRequest),
    getFiveMostRecentReviewRequests: yield* Queries.makeStatefulQuery(GetFiveMostRecentReviewRequests),
    getReceivedReviewRequest: yield* Queries.makeQuery(
      'ReviewRequestQueries.getReceivedReviewRequest',
      GetReceivedReviewRequest.createFilter,
      GetReceivedReviewRequest.query,
    ),
    getPublishedReviewRequest: yield* Queries.makeQuery(
      'ReviewRequestQueries.getPublishedReviewRequest',
      GetPublishedReviewRequest.createFilter,
      GetPublishedReviewRequest.query,
    ),
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: yield* Queries.makeQuery(
      'ReviewRequestQueries.getPreprintsWithARecentReviewRequestsMatchingAPrereviewer',
      GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.createFilter,
      flow(GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.query, Either.right),
    ),
    searchForPublishedReviewRequests: yield* Queries.makeStatefulQuery(SearchForPublishedReviewRequests),
    findReviewRequestsNeedingCategorization: yield* Queries.makeSimpleQuery(
      'ReviewRequestQueries.findReviewRequestsNeedingCategorization',
      FindReviewRequestsNeedingCategorization.filter,
      FindReviewRequestsNeedingCategorization.query,
    ),
  }
})

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
