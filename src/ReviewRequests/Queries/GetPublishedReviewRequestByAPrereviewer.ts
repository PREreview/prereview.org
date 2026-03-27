import { type Array, Either } from 'effect'
import type * as Events from '../../Events.ts'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Either.Either<Uuid.Uuid, Errors.UnknownReviewRequest>

type State = undefined

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => undefined

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const query = (state: State, input: Input): Result => Either.left(new Errors.UnknownReviewRequest({}))

export const GetPublishedReviewRequestByAPrereviewer = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getPublishedReviewRequestByAPrereviewer',
  initialState: undefined,
  updateStateWithEvents,
  query,
})
