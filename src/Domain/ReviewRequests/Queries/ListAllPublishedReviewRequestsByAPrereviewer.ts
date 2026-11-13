import { Array, Result, flow, HashMap, Order, Schema, Struct } from 'effect'
import * as Preprints from '../../../Preprints/index.ts'
import * as Queries from '../../../Queries.ts'
import { OrcidId, Temporal } from '../../../types/index.ts'
import { SubfieldIdSchema } from '../../../types/subfield.ts'
import * as shared from './sharedLogic.ts'

export type PublishedReviewRequestByAPrereviewer = typeof PublishedReviewRequestByAPrereviewer.Type

export const PublishedReviewRequestByAPrereviewer = Schema.Struct({
  published: Temporal.InstantSchema,
  subfields: Schema.Array(SubfieldIdSchema),
  preprintId: Preprints.IndeterminatePreprintId,
})

export type Result = ReadonlyArray<PublishedReviewRequestByAPrereviewer>

export interface Input {
  requesterId: OrcidId.OrcidId
}

const query = (state: shared.State, input: Input): Result => {
  const filteredReviewRequests = HashMap.filterMap(state, reviewRequest =>
    reviewRequest._tag === 'PublishedReviewRequest' &&
    typeof reviewRequest.requesterId === 'string' &&
    OrcidId.OrcidIdEquivalence(reviewRequest.requesterId, input.requesterId)
      ? Result.succeed(reviewRequest)
      : Result.fail(reviewRequest),
  )

  const sortedReviewRequests = Array.sortWith(
    HashMap.values(filteredReviewRequests),
    Struct.get('published'),
    Order.flip(Temporal.OrderInstant),
  )

  return Array.map(sortedReviewRequests, reviewRequest => PublishedReviewRequestByAPrereviewer.make(reviewRequest))
}

export const ListAllPublishedReviewRequestsByAPrereviewer = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.listAllPublishedReviewRequestsByAPrereviewer',
  initialState: shared.initialState,
  updateStateWithEvents: shared.updateStateWithEvents,
  query: flow(query, Result.succeed),
})
