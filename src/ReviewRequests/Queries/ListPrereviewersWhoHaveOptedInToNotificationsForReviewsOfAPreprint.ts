import type { Array, HashMap, HashSet } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import type * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'

export type Input = Preprints.IndeterminatePreprintId

export type Result = HashSet.HashSet<OrcidId.OrcidId>

interface PublishedReviewRequest {
  _tag: 'PublishedReviewRequest'
  preprintId: Preprints.IndeterminatePreprintId
  optedIn: boolean
  requesterId: OrcidId.OrcidId
}

interface ReviewRequestPendingPublication {
  _tag: 'ReviewRequestPendingPublication'
  preprintId: Preprints.IndeterminatePreprintId
  optedIn: boolean
  requesterId: OrcidId.OrcidId
}

type ReviewRequest = PublishedReviewRequest | ReviewRequestPendingPublication

interface State {
  readonly reviewRequests: HashMap.HashMap<Uuid.Uuid, ReviewRequest>
  readonly reviewRequestsByPreprintId: HashMap.HashMap<string, Array.NonEmptyReadonlyArray<Uuid.Uuid>>
}

export declare const ListPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint: Queries.StatefulQuery<
  State,
  [Input],
  Result
>
