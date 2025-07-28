import { Either } from 'effect'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export const CheckIfReviewIsBeingPublished = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  void,
  Errors.DatasetReviewHasBeenPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
> => Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'Not implemented' }))
