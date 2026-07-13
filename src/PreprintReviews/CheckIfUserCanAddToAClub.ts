import type { Effect, Either, Option } from 'effect'
import type { ClubId } from '../Clubs/index.ts'
import type { Keyv } from '../keyv.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type * as Errors from './Errors.ts'

export interface Input {
  preprintId: IndeterminatePreprintId
  orcidId: OrcidId
}

export type Result = Either.Either<Option.Option<ClubId | null>, Errors.PreprintReviewNotFound>

export declare const CheckIfUserCanAddToAClub: (
  formStore: Keyv<unknown>,
) => (input: Input) => Effect.Effect<Either.Either.Right<Result>, Either.Either.Left<Result>>
