import type { Either } from 'effect'
import type * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export declare const CheckIfReviewIsBeingPublished: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Either.Either<
  void,
  Errors.DatasetReviewHasBeenPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
>
