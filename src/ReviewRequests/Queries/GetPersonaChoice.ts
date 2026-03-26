import type { Either, Option } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import type { OrcidId } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId.OrcidId
  preprintId: Preprints.IndeterminatePreprintId
}

export type Result = Either.Either<
  Option.Option<'public' | 'pseudonym'>,
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>
