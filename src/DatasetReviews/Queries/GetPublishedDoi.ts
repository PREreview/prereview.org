import { Either } from 'effect'
import type { Doi } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export const GetPublishedDoi = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  Doi.Doi,
  Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
> => Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'not implemented' }))
