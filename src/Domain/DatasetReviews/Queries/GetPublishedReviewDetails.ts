import { Array, Result, Option, Struct, type Types } from 'effect'
import * as Queries from '../../../Queries.ts'
import type { Doi, Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export interface PublishedReviewDetails {
  doi: Doi.Doi
  id: Uuid.Uuid
  otherAuthors?: boolean
  persona: 'public' | 'pseudonym'
}

export const GetPublishedReviewDetails = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Result.Result<
  PublishedReviewDetails,
  Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewIsInProgress | Queries.UnexpectedSequenceOfEvents
> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    const persona = Array.findLast(events, hasTag('PersonaForDatasetReviewWasChosen'))

    const inviteAuthors = Array.findLast(events, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview'))

    return Option.match(Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi')), {
      onNone: () =>
        Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasAssignedADoi event found' })),
      onSome: datasetReviewWasAssignedADoi =>
        Result.succeed({
          doi: datasetReviewWasAssignedADoi.doi,
          id: datasetReviewWasAssignedADoi.datasetReviewId,
          persona: Option.match(persona, { onSome: Struct.get('persona'), onNone: () => 'public' }),
          otherAuthors: Option.match(inviteAuthors, {
            onSome: ({ answer }) => answer === 'yes',
            onNone: () => undefined,
          }),
        }),
    })
  }

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Result.fail(new Errors.DatasetReviewIsBeingPublished())
  }

  return Result.fail(new Errors.DatasetReviewIsInProgress())
}

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  tag: Types.Tags<Events.DatasetReviewEvent>,
): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
