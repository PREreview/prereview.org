import { Either, Equal, flow, HashMap, Option, Tuple } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as shared from './sharedLogic.ts'

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Option.Option<Uuid.Uuid>

const query = (state: shared.State, input: Input): Result =>
  Option.map(
    HashMap.findFirst(
      state,
      reviewRequest =>
        Preprints.PreprintIdEquivalence(reviewRequest.preprintId, input.preprintId) &&
        Equal.equals(reviewRequest.requesterId, input.requesterId),
    ),
    Tuple.getFirst,
  )

export const FindReviewRequestByAPrereviewer = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.findReviewRequestByAPrereviewer',
  initialState: shared.initialState,
  updateStateWithEvents: shared.updateStateWithEvents,
  query: flow(query, Either.right),
})
