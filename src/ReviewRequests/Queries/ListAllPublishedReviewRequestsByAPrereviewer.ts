import { Array, Either, flow, HashMap, Order, Predicate, Schema, Struct, type Types } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { OrcidId, Temporal } from '../../types/index.ts'
import { SubfieldIdSchema } from '../../types/subfield.ts'
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
  const filteredReviewRequests = HashMap.filter(
    state,
    Predicate.compose(
      hasTag('PublishedReviewRequest'),
      reviewRequest =>
        typeof reviewRequest.requesterId === 'string' &&
        OrcidId.OrcidIdEquivalence(reviewRequest.requesterId, input.requesterId),
    ),
  )

  const sortedReviewRequests = Array.sortWith(
    HashMap.values(filteredReviewRequests),
    Struct.get('published'),
    Order.reverse(Temporal.OrderInstant),
  )

  return Array.map(sortedReviewRequests, reviewRequest => PublishedReviewRequestByAPrereviewer.make(reviewRequest))
}

export const ListAllPublishedReviewRequestsByAPrereviewer = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.listAllPublishedReviewRequestsByAPrereviewer',
  initialState: shared.initialState,
  updateStateWithEvents: shared.updateStateWithEvents,
  query: flow(query, Either.right),
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
