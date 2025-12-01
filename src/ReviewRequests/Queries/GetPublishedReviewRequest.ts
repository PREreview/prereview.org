import type { Temporal } from '@js-temporal/polyfill'
import type { Either } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface PublishedReviewRequest {
  author: { name: NonEmptyString.NonEmptyString }
  preprintId: Preprints.IndeterminatePreprintId
  id: Uuid.Uuid
  published: Temporal.Instant
}

export interface Input {
  reviewRequestId: Uuid.Uuid
}

export type Result = Either.Either<PublishedReviewRequest, Errors.UnknownReviewRequest>
