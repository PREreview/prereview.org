import { Context, Effect, Layer } from 'effect'
import type * as EventDispatcher from '../../EventDispatcher.ts'
import type * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
import { DoesAPreprintHaveAReviewRequest } from './DoesAPreprintHaveAReviewRequest.ts'
import { FindReviewRequestsNeedingCategorization } from './FindReviewRequestsNeedingCategorization.ts'
import { GetFiveMostRecentReviewRequests } from './GetFiveMostRecentReviewRequests.ts'
import { GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer } from './GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
import { GetPublishedReviewRequest } from './GetPublishedReviewRequest.ts'
import { GetReceivedReviewRequest } from './GetReceivedReviewRequest.ts'
import { GetReviewRequestToAcknowledge } from './GetReviewRequestToAcknowledge.ts'
import { ListAllPublishedReviewRequestsForStats } from './ListAllPublishedReviewRequestsForStats.ts'
import { SearchForPublishedReviewRequests } from './SearchForPublishedReviewRequests.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    doesAPreprintHaveAReviewRequest: Queries.FromStatefulQuery<typeof DoesAPreprintHaveAReviewRequest>
    getFiveMostRecentReviewRequests: Queries.FromStatefulQuery<typeof GetFiveMostRecentReviewRequests>
    getReceivedReviewRequest: Queries.FromOnDemandQuery<typeof GetReceivedReviewRequest>
    getPublishedReviewRequest: Queries.FromOnDemandQuery<typeof GetPublishedReviewRequest>
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: Queries.FromOnDemandQuery<
      typeof GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer
    >
    searchForPublishedReviewRequests: Queries.FromStatefulQuery<typeof SearchForPublishedReviewRequests>
    findReviewRequestsNeedingCategorization: Queries.FromOnDemandQuery<typeof FindReviewRequestsNeedingCategorization>
    getReviewRequestToAcknowledge: Queries.FromOnDemandQuery<typeof GetReviewRequestToAcknowledge>
    listAllPublishedReviewRequestsForStats: Queries.FromStatefulQuery<typeof ListAllPublishedReviewRequestsForStats>
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
  getReviewRequestToAcknowledge,
  listAllPublishedReviewRequestsForStats,
} = Effect.serviceFunctions(ReviewRequestQueries)

export type { RecentReviewRequest } from './GetFiveMostRecentReviewRequests.ts'
export type { RecentReviewRequestMatchingAPrereviewer } from './GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer.ts'
export {
  PublishedPrereviewerReviewRequest,
  PublishedReceivedReviewRequest,
  type PublishedReviewRequest,
} from './GetPublishedReviewRequest.ts'
export type { ReceivedReviewRequest } from './GetReceivedReviewRequest.ts'
export type { ReviewRequestToAcknowledge } from './GetReviewRequestToAcknowledge.ts'
export { ReviewRequestForStats } from './ListAllPublishedReviewRequestsForStats.ts'

const makeReviewRequestQueries: Effect.Effect<
  typeof ReviewRequestQueries.Service,
  never,
  EventStore.EventStore | EventDispatcher.EventDispatcher
> = Effect.gen(function* () {
  return {
    doesAPreprintHaveAReviewRequest: yield* Queries.makeStatefulQuery(DoesAPreprintHaveAReviewRequest),
    getFiveMostRecentReviewRequests: yield* Queries.makeStatefulQuery(GetFiveMostRecentReviewRequests),
    getReceivedReviewRequest: yield* Queries.makeOnDemandQuery(GetReceivedReviewRequest),
    getPublishedReviewRequest: yield* Queries.makeOnDemandQuery(GetPublishedReviewRequest),
    getPreprintsWithARecentReviewRequestsMatchingAPrereviewer: yield* Queries.makeOnDemandQuery(
      GetPreprintsWithARecentReviewRequestsMatchingAPrereviewer,
    ),
    searchForPublishedReviewRequests: yield* Queries.makeStatefulQuery(SearchForPublishedReviewRequests),
    findReviewRequestsNeedingCategorization: yield* Queries.makeOnDemandQuery(FindReviewRequestsNeedingCategorization),
    getReviewRequestToAcknowledge: yield* Queries.makeOnDemandQuery(GetReviewRequestToAcknowledge),
    listAllPublishedReviewRequestsForStats: yield* Queries.makeStatefulQuery(ListAllPublishedReviewRequestsForStats),
  }
})

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
