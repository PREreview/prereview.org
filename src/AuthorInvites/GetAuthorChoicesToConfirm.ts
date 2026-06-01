import { Data, type Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Either.Either<{ persona: 'public' | 'pseudonym' }, Error>

export type Error = PrereviewerIsNotListedOnTheReview | ChoicesHaveBeenConfirmed | PersonaHasNotBeenChosen

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

export class ChoicesHaveBeenConfirmed extends Data.TaggedError('ChoicesHaveBeenConfirmed') {}

export class PersonaHasNotBeenChosen extends Data.TaggedError('PersonaHasNotBeenChosen') {}

export declare const GetAuthorChoicesToConfirm: Queries.OnDemandQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
