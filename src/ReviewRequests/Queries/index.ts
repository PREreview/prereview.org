import { Context, Effect, Fiber, Layer, Match } from 'effect'
import type * as EventDispatcher from '../../EventDispatcher.ts'
import type * as EventStore from '../../EventStore.ts'
import * as Queries from '../../Queries.ts'
import { ReviewRequestNotReadyToBePublished } from '../Errors.ts'
import { DoesAPreprintHaveAReviewRequest } from './DoesAPreprintHaveAReviewRequest.ts'
import { DoesAReviewRequestNeedAContactAddressToBeVerified } from './DoesAReviewRequestNeedAContactAddressToBeVerified.ts'
import { DoesAReviewRequestNeedADecisionOnReviewNotifications } from './DoesAReviewRequestNeedADecisionOnReviewNotifications.ts'
import { FindReviewRequestByAPrereviewer } from './FindReviewRequestByAPrereviewer.ts'
import { FindReviewRequestsNeedingCategorization } from './FindReviewRequestsNeedingCategorization.ts'
import { GetFiveMostRecentReviewRequests } from './GetFiveMostRecentReviewRequests.ts'
import { GetNextExpectedCommandForAUserOnAReviewRequest } from './GetNextExpectedCommandForAUserOnAReviewRequest.ts'
import { GetPersonaChoice } from './GetPersonaChoice.ts'
import { GetPublishedReviewRequest } from './GetPublishedReviewRequest.ts'
import { GetPublishedReviewRequestByAPrereviewer } from './GetPublishedReviewRequestByAPrereviewer.ts'
import { GetReceivedReviewRequest } from './GetReceivedReviewRequest.ts'
import { GetReviewRequestReadyToBePublished } from './GetReviewRequestReadyToBePublished.ts'
import { GetReviewRequestToAcknowledge } from './GetReviewRequestToAcknowledge.ts'
import { ListAllPublishedReviewRequestsByAPrereviewer } from './ListAllPublishedReviewRequestsByAPrereviewer.ts'
import { ListAllPublishedReviewRequestsForStats } from './ListAllPublishedReviewRequestsForStats.ts'
import { ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications } from './ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications.ts'
import { SearchForPublishedReviewRequests } from './SearchForPublishedReviewRequests.ts'

export class ReviewRequestQueries extends Context.Tag('ReviewRequestQueries')<
  ReviewRequestQueries,
  {
    doesAPreprintHaveAReviewRequest: Queries.FromStatefulQuery<typeof DoesAPreprintHaveAReviewRequest>
    findReviewRequestByAPrereviewer: Queries.FromStatefulQuery<typeof FindReviewRequestByAPrereviewer>
    getNextExpectedCommandForAUserOnAReviewRequest: Queries.FromOnDemandQuery<
      typeof GetNextExpectedCommandForAUserOnAReviewRequest
    >
    getPersonaChoice: Queries.FromStatefulQuery<typeof GetPersonaChoice>
    getReviewRequestReadyToBePublished: Queries.FromStatefulQuery<typeof GetReviewRequestReadyToBePublished>
    getPublishedReviewRequestByAPrereviewer: Queries.FromStatefulQuery<typeof GetPublishedReviewRequestByAPrereviewer>
    getFiveMostRecentReviewRequests: Queries.FromStatefulQuery<typeof GetFiveMostRecentReviewRequests>
    getReceivedReviewRequest: Queries.FromOnDemandQuery<typeof GetReceivedReviewRequest>
    getPublishedReviewRequest: Queries.FromOnDemandQuery<typeof GetPublishedReviewRequest>
    searchForPublishedReviewRequests: Queries.FromStatefulQuery<typeof SearchForPublishedReviewRequests>
    findReviewRequestsNeedingCategorization: Queries.FromOnDemandQuery<typeof FindReviewRequestsNeedingCategorization>
    getReviewRequestToAcknowledge: Queries.FromOnDemandQuery<typeof GetReviewRequestToAcknowledge>
    listAllPublishedReviewRequestsByAPrereviewer: Queries.FromStatefulQuery<
      typeof ListAllPublishedReviewRequestsByAPrereviewer
    >
    listAllPublishedReviewRequestsForStats: Queries.FromStatefulQuery<typeof ListAllPublishedReviewRequestsForStats>
    listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications: Queries.FromStatefulQuery<
      typeof ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications
    >
    doesAReviewRequestNeedAContactAddressToBeVerified: Queries.FromStatefulQuery<
      typeof DoesAReviewRequestNeedAContactAddressToBeVerified
    >
    doesAReviewRequestNeedADecisionOnReviewNotifications: Queries.FromStatefulQuery<
      typeof DoesAReviewRequestNeedADecisionOnReviewNotifications
    >
  }
>() {}

export const doesAPreprintHaveAReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['doesAPreprintHaveAReviewRequest']>
) => Effect.flatMap(ReviewRequestQueries, service => service.doesAPreprintHaveAReviewRequest(...args))

export const findReviewRequestByAPrereviewer = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['findReviewRequestByAPrereviewer']>
) => Effect.flatMap(ReviewRequestQueries, service => service.findReviewRequestByAPrereviewer(...args))

export const getNextExpectedCommandForAUserOnAReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getNextExpectedCommandForAUserOnAReviewRequest']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getNextExpectedCommandForAUserOnAReviewRequest(...args))

export const getPersonaChoice = (...args: Parameters<(typeof ReviewRequestQueries.Service)['getPersonaChoice']>) =>
  Effect.flatMap(ReviewRequestQueries, service => service.getPersonaChoice(...args))

export const getReviewRequestReadyToBePublished = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getReviewRequestReadyToBePublished']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getReviewRequestReadyToBePublished(...args))

export const getPublishedReviewRequestByAPrereviewer = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getPublishedReviewRequestByAPrereviewer']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getPublishedReviewRequestByAPrereviewer(...args))

export const getFiveMostRecentReviewRequests = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getFiveMostRecentReviewRequests']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getFiveMostRecentReviewRequests(...args))

export const getReceivedReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getReceivedReviewRequest']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getReceivedReviewRequest(...args))

export const getPublishedReviewRequest = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getPublishedReviewRequest']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getPublishedReviewRequest(...args))

export const searchForPublishedReviewRequests = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['searchForPublishedReviewRequests']>
) => Effect.flatMap(ReviewRequestQueries, service => service.searchForPublishedReviewRequests(...args))

export const findReviewRequestsNeedingCategorization = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['findReviewRequestsNeedingCategorization']>
) => Effect.flatMap(ReviewRequestQueries, service => service.findReviewRequestsNeedingCategorization(...args))

export const getReviewRequestToAcknowledge = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['getReviewRequestToAcknowledge']>
) => Effect.flatMap(ReviewRequestQueries, service => service.getReviewRequestToAcknowledge(...args))

export const listAllPublishedReviewRequestsByAPrereviewer = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['listAllPublishedReviewRequestsByAPrereviewer']>
) => Effect.flatMap(ReviewRequestQueries, service => service.listAllPublishedReviewRequestsByAPrereviewer(...args))

export const listAllPublishedReviewRequestsForStats = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['listAllPublishedReviewRequestsForStats']>
) => Effect.flatMap(ReviewRequestQueries, service => service.listAllPublishedReviewRequestsForStats(...args))

export const listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications = (
  ...args: Parameters<
    (typeof ReviewRequestQueries.Service)['listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications']
  >
) =>
  Effect.flatMap(ReviewRequestQueries, service =>
    service.listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications(...args),
  )

export const doesAReviewRequestNeedAContactAddressToBeVerified = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['doesAReviewRequestNeedAContactAddressToBeVerified']>
) => Effect.flatMap(ReviewRequestQueries, service => service.doesAReviewRequestNeedAContactAddressToBeVerified(...args))

export const doesAReviewRequestNeedADecisionOnReviewNotifications = (
  ...args: Parameters<(typeof ReviewRequestQueries.Service)['doesAReviewRequestNeedADecisionOnReviewNotifications']>
) =>
  Effect.flatMap(ReviewRequestQueries, service => service.doesAReviewRequestNeedADecisionOnReviewNotifications(...args))

export type { ContactAddress } from './DoesAReviewRequestNeedAContactAddressToBeVerified.ts'
export type { RecentReviewRequest } from './GetFiveMostRecentReviewRequests.ts'
export type { NextExpectedCommand } from './GetNextExpectedCommandForAUserOnAReviewRequest.ts'
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
  const getReviewRequestReadyToBePublished = yield* Queries.makeStatefulQuery(GetReviewRequestReadyToBePublished)

  const doesAReviewRequestNeedAContactAddressToBeVerified = yield* Queries.makeStatefulQuery(
    DoesAReviewRequestNeedAContactAddressToBeVerified,
  )

  const doesAReviewRequestNeedADecisionOnReviewNotifications = yield* Queries.makeStatefulQuery(
    DoesAReviewRequestNeedADecisionOnReviewNotifications,
  )

  return {
    doesAPreprintHaveAReviewRequest: yield* Queries.makeStatefulQuery(DoesAPreprintHaveAReviewRequest),
    findReviewRequestByAPrereviewer: yield* Queries.makeStatefulQuery(FindReviewRequestByAPrereviewer),
    getNextExpectedCommandForAUserOnAReviewRequest: yield* Queries.makeOnDemandQuery(
      GetNextExpectedCommandForAUserOnAReviewRequest,
    ),
    getReviewRequestReadyToBePublished: Effect.fnUntraced(function* (input) {
      const contactAddressFiber = yield* Effect.fork(doesAReviewRequestNeedAContactAddressToBeVerified(input))
      const needsNotificationsDecisionFiber = yield* Effect.fork(
        doesAReviewRequestNeedADecisionOnReviewNotifications(input),
      )

      const reviewRequest = yield* getReviewRequestReadyToBePublished(input)

      const { contactAddress } = yield* Fiber.join(contactAddressFiber)

      return yield* Match.valueTags(contactAddress, {
        NoContactAddress: () => new ReviewRequestNotReadyToBePublished({ missing: ['ContactAddressVerified'] }),
        UnverifiedContactAddress: () => new ReviewRequestNotReadyToBePublished({ missing: ['ContactAddressVerified'] }),
        VerifiedContactAddress: () =>
          Effect.gen(function* () {
            const needsNotificationsDecision = yield* Fiber.join(needsNotificationsDecisionFiber)

            if (needsNotificationsDecision) {
              return yield* new ReviewRequestNotReadyToBePublished({ missing: ['DecisionOnReviewNotifications'] })
            }

            return reviewRequest
          }),
      })
    }),
    getPersonaChoice: yield* Queries.makeStatefulQuery(GetPersonaChoice),
    getPublishedReviewRequestByAPrereviewer: yield* Queries.makeStatefulQuery(GetPublishedReviewRequestByAPrereviewer),
    getFiveMostRecentReviewRequests: yield* Queries.makeStatefulQuery(GetFiveMostRecentReviewRequests),
    getReceivedReviewRequest: yield* Queries.makeOnDemandQuery(GetReceivedReviewRequest),
    getPublishedReviewRequest: yield* Queries.makeOnDemandQuery(GetPublishedReviewRequest),
    searchForPublishedReviewRequests: yield* Queries.makeStatefulQuery(SearchForPublishedReviewRequests),
    findReviewRequestsNeedingCategorization: yield* Queries.makeOnDemandQuery(FindReviewRequestsNeedingCategorization),
    getReviewRequestToAcknowledge: yield* Queries.makeOnDemandQuery(GetReviewRequestToAcknowledge),
    listAllPublishedReviewRequestsByAPrereviewer: yield* Queries.makeStatefulQuery(
      ListAllPublishedReviewRequestsByAPrereviewer,
    ),
    listAllPublishedReviewRequestsForStats: yield* Queries.makeStatefulQuery(ListAllPublishedReviewRequestsForStats),
    listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications: yield* Queries.makeStatefulQuery(
      ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications,
    ),
    doesAReviewRequestNeedAContactAddressToBeVerified,
    doesAReviewRequestNeedADecisionOnReviewNotifications,
  }
})

export const queriesLayer = Layer.effect(ReviewRequestQueries, makeReviewRequestQueries)
