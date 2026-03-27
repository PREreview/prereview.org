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

export type Result = Either.Either<
  { personaChoice: 'public' | 'pseudonym'; reviewRequestId: Uuid.Uuid },
  Errors.UnknownReviewRequest | Errors.ReviewRequestNotReadyToBePublished | Errors.ReviewRequestHasBeenPublished
>

type State = undefined

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => undefined

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const query = (state: State, input: Input): Result => Either.left(new Errors.UnknownReviewRequest({}))

export const GetReviewRequestReadyToBePublished = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getReviewRequestReadyToBePublished',
  initialState: undefined,
  updateStateWithEvents,
  query,
})
