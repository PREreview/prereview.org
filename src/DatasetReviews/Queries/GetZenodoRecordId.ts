import { Either } from 'effect'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export const GetZenodoRecordId = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<number, Errors.DatasetReviewDoesNotHaveAZenodoRecord | Errors.UnexpectedSequenceOfEvents> =>
  Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'not implemented' }))
