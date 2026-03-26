import { Either, type Option } from 'effect'
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

export const GetPersonaChoice = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.getPersonaChoice',
  initialState: undefined,
  updateStateWithEvents: () => undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query: (state: undefined, input: Input) => Either.left(new Errors.UnknownReviewRequest({})),
})
