import { Array, Either, flow, Option, Struct } from 'effect'
import type { OrcidId } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export const GetAuthor: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Either.Either<OrcidId.OrcidId, Errors.UnexpectedSequenceOfEvents> = flow(
  Array.findLast(hasTag('DatasetReviewWasStarted')),
  Option.map(Struct.get('authorId')),
  Either.fromOption(() => new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' })),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
