import type { Either } from 'effect'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import type * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId
  preprintId: IndeterminatePreprintId
}

export type Result = Either.Either<boolean, Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished>

type State = undefined

export declare const DoesAReviewRequestNeedADecisionOnReviewNotifications: Queries.StatefulQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>,
  State
>
