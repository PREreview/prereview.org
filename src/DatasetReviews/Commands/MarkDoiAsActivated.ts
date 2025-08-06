import { Array, Data, Either, Function, Option } from 'effect'
import type { Doi, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewHasNotBeenPublished
  | Errors.DatasetReviewHasNotBeenAssignedADoi

export type State = NotStarted | NotPublished | HasNotBeenAssignedADoi | HasAnInactiveDoi | HasAnActiveDoi

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotPublished extends Data.TaggedClass('NotPublished') {}

export class HasNotBeenAssignedADoi extends Data.TaggedClass('HasNotBeenAssignedADoi') {}

export class HasAnInactiveDoi extends Data.TaggedClass('HasAnInactiveDoi')<{ doi: Doi.Doi }> {}

export class HasAnActiveDoi extends Data.TaggedClass('HasAnActiveDoi')<{ doi: Doi.Doi }> {}

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return new NotStarted()
  }

  if (!hasEvent(events, 'DatasetReviewWasPublished')) {
    return new NotPublished()
  }

  const doiAssigned = Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi'))

  if (Option.isNone(doiAssigned)) {
    return new HasNotBeenAssignedADoi()
  }

  const doi = doiAssigned.value.doi

  return Option.match(Array.findLast(events, hasTag('DatasetReviewDoiWasActivated')), {
    onNone: () => new HasAnInactiveDoi({ doi }),
    onSome: () => new HasAnActiveDoi({ doi }),
  })
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
)

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
