import { Array, Either, Equivalence, flow, Option, pipe, Record, Struct } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import type { TopicId } from '../../types/Topic.ts'
import * as shared from './sharedLogic.ts'

export interface RecentReviewRequest {
  readonly id: Uuid.Uuid
  readonly published: Temporal.Instant
  readonly topics: ReadonlyArray<TopicId>
  readonly preprintId: Preprints.IndeterminatePreprintId
}

export type Result = ReadonlyArray<RecentReviewRequest>

const query = (reviewRequests: shared.State): Result => {
  const filteredReviewRequests = Record.filterMap(reviewRequests, reviewRequest =>
    reviewRequest.published !== undefined
      ? Option.some({
          published: reviewRequest.published,
          topics: reviewRequest.topics,
          preprintId: reviewRequest.preprintId,
        })
      : Option.none(),
  )

  const sortedReviewRequests = Array.reverse(
    Array.sortWith(
      Array.map(Array.fromRecord(filteredReviewRequests), ([id, properties]) => ({ ...properties, id })),
      Struct.get('published'),
      Temporal.OrderInstant,
    ),
  )

  const seenPreprintIds = Array.empty<Preprints.IndeterminatePreprintId>()

  return pipe(
    Array.takeWhile(sortedReviewRequests, reviewRequest => {
      if (Array.length(seenPreprintIds) >= 5) {
        return false
      }

      if (!Array.containsWith(Preprints.PreprintIdEquivalence)(seenPreprintIds, reviewRequest.preprintId)) {
        seenPreprintIds.push(reviewRequest.preprintId)
      }

      return true
    }),
    Array.dedupeWith(Equivalence.mapInput(Preprints.PreprintIdEquivalence, Struct.get('preprintId'))),
  )
}

export const GetFiveMostRecentReviewRequests = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getFiveMostRecentReviewRequests',
  initialState: shared.initialState,
  updateStateWithEvents: shared.updateStateWithEvents,
  query: flow(query, Either.right),
})
