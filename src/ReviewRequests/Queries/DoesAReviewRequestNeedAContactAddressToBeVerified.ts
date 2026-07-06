import { Data, type Either } from 'effect'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import type * as Queries from '../../Queries.ts'
import type { EmailAddress } from '../../types/EmailAddress.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId
  preprintId: IndeterminatePreprintId
}

export type Result = Either.Either<
  { contactAddress: ContactAddress; reviewRequestId: Uuid },
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

type ContactAddress = VerifiedContactAddress | UnverifiedContactAddress | NoContactAddress

export class VerifiedContactAddress extends Data.TaggedClass('VerifiedContactAddress')<{ value: EmailAddress }> {}

export class UnverifiedContactAddress extends Data.TaggedClass('UnverifiedContactAddress')<{ value: EmailAddress }> {}

export class NoContactAddress extends Data.TaggedClass('NoContactAddress') {}

type State = undefined

export declare const DoesAReviewRequestNeedAContactAddressToBeVerified: Queries.StatefulQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>,
  State
>
