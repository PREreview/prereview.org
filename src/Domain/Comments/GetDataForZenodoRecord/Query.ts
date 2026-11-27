import { Array, Option, Result, Struct, type Types } from 'effect'
import type { Html } from '../../../html.ts'
import type { NonEmptyString, OrcidId, Uuid } from '../../../types/index.ts'
import * as Events from '../../Events/index.ts'
import { Queries } from '../../Events/index.ts'
import * as Errors from '../Errors.ts'

export type Input = Uuid.Uuid

export interface DataForZenodoRecord {
  readonly authorId: OrcidId.OrcidId
  readonly persona: 'public' | 'pseudonym'
  readonly prereviewId: number
  readonly comment: Html
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
}

export type Error =
  | Errors.CommentHasNotBeenStarted
  | Errors.CommentIsIncomplete
  | Errors.CommentWasAlreadyPublished
  | Errors.CommentHasBeenWithdrawn
  | Queries.UnexpectedSequenceOfEvents

export type Result = Result.Result<DataForZenodoRecord, Error>

const createFilter = (commentId: Input) =>
  Events.EventFilter({
    types: Events.CommentEventTypes,
    predicates: { commentId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const started = Option.getOrUndefined(Array.findLast(filteredEvents, hasTag('CommentWasStarted')))

  if (started === undefined) {
    return Result.fail(new Errors.CommentHasNotBeenStarted())
  }

  if (Array.some(filteredEvents, hasTag('CommentWasWithdrawn'))) {
    return Result.fail(new Errors.CommentHasBeenWithdrawn())
  }

  if (Array.some(filteredEvents, hasTag('CommentWasPublished'))) {
    return Result.fail(new Errors.CommentWasAlreadyPublished())
  }

  if (!Array.some(filteredEvents, hasTag('PublicationOfCommentWasRequested'))) {
    return Result.fail(new Errors.CommentIsIncomplete())
  }

  return Result.fromOption(
    Option.all({
      persona: Option.map(Array.findLast(filteredEvents, hasTag('PersonaForCommentWasChosen')), Struct.get('persona')),
      comment: Option.map(Array.findLast(filteredEvents, hasTag('CommentWasEntered')), Struct.get('comment')),
      competingInterests: Option.map(
        Array.findLast(filteredEvents, hasTag('CompetingInterestsForCommentWereDeclared')),
        Struct.get('competingInterests'),
      ),
    }),
    () => new Queries.UnexpectedSequenceOfEvents({}),
  ).pipe(Result.map(data => ({ authorId: started.authorId, prereviewId: started.prereviewId, ...data })))
}

export const GetDataForZenodoRecord = Queries.OnDemandQuery({
  name: 'Comments.getDataForZenodoRecord.Query',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
