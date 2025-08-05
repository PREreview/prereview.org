import { Data } from 'effect'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewHasNotBeenPublished
  | Errors.DatasetReviewDoesNotHaveAZenodoRecord

export type State = NotStarted | NotPublished | DoesNotHaveARecord | HasAnUnpublishedRecord | HasAPublishedRecord

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotPublished extends Data.TaggedClass('NotPublished') {}

export class DoesNotHaveARecord extends Data.TaggedClass('DoesNotHaveARecord') {}

export class HasAnUnpublishedRecord extends Data.TaggedClass('HasAnUnpublishedRecord')<{ recordId: number }> {}

export class HasAPublishedRecord extends Data.TaggedClass('HasAPublishedRecord')<{ recordId: number }> {}
