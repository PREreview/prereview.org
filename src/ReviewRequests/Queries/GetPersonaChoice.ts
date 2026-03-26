import { Either, HashMap, type Option } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Either.Either<
  { personaChoice: Option.Option<'public' | 'pseudonym'>; reviewRequestId: Uuid.Uuid },
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

interface ReviewRequest {
  requesterId: OrcidId.OrcidId
  requestState: 'published' | 'pending'
}

type State = HashMap.HashMap<Uuid.Uuid, ReviewRequest>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const query = (state: State, input: Input): Result => Either.left(new Errors.UnknownReviewRequest({}))

export const GetPersonaChoice = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getPersonaChoice',
  initialState: HashMap.empty(),
  updateStateWithEvents: state => state,
  query,
})
