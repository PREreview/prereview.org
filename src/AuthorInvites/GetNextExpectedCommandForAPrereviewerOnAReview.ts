import { Data, type Either, type Option } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Either.Either<Option.Option<NextExpectedCommand>, Error>

export type NextExpectedCommand = 'ChoosePersona'

export type Error = PrereviewerIsNotListedOnTheReview

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

export declare const GetNextExpectedCommandForAPrereviewerOnAReview: Queries.OnDemandQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
