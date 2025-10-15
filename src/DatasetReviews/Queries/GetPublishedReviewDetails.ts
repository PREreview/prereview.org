import { Array, Either, Option, Struct } from 'effect'
import type { Doi, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export interface PublishedReviewDetails {
  doi: Doi.Doi
  id: Uuid.Uuid
  persona: 'public' | 'pseudonym'
}

export const GetPublishedReviewDetails = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  PublishedReviewDetails,
  Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    const persona = Array.findLast(events, hasTag('PersonaForDatasetReviewWasChosen'))

    return Option.match(Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi')), {
      onNone: () =>
        Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasAssignedADoi event found' })),
      onSome: datasetReviewWasAssignedADoi =>
        Either.right({
          doi: datasetReviewWasAssignedADoi.doi,
          id: datasetReviewWasAssignedADoi.datasetReviewId,
          persona: Option.match(persona, { onSome: Struct.get('persona'), onNone: () => 'public' }),
        }),
    })
  }

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsBeingPublished())
  }

  return Either.left(new Errors.DatasetReviewIsInProgress())
}

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
