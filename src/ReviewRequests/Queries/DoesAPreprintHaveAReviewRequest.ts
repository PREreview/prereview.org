import { Either, Equal, flow, Record } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import * as shared from './sharedLogic.ts'

export interface Input {
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = boolean

const query = (state: shared.State, input: Input): Result => {
  return Record.some(
    state,
    reviewRequest => Equal.equals(reviewRequest.preprintId, input.preprintId) && reviewRequest.accepted,
  )
}

export const DoesAPreprintHaveAReviewRequest = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.doesAPreprintHaveAReviewRequest',
  initialState: shared.initialState,
  updateStateWithEvent: shared.updateStateWithEvent,
  query: flow(query, Either.right),
})
