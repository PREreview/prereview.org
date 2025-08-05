import type { Either } from 'effect'
import type { Doi } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export declare const GetPublishedDoi: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Either.Either<
  Doi.Doi,
  Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
>
