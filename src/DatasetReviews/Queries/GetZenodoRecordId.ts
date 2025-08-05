import type { Either } from 'effect'
import type * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export declare const GetZenodoRecordId: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Either.Either<number, Errors.DatasetReviewDoesNotHaveAZenodoRecord | Errors.UnexpectedSequenceOfEvents>
