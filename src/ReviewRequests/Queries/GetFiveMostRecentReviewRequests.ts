import { Array, Either, Equivalence, flow, Option, Record, Struct } from 'effect'
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

  const latestReviewRequestForEachPreprint = Array.dedupeWith(
    sortedReviewRequests,
    Equivalence.mapInput(Preprints.PreprintIdEquivalence, Struct.get('preprintId')),
  )

  return Array.take(latestReviewRequestForEachPreprint, 5)
}

export const GetFiveMostRecentReviewRequests = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getFiveMostRecentReviewRequests',
  initialState: shared.initialState,
  updateStateWithEvent: shared.updateStateWithEvent,
  query: flow(query, Either.right),
})
