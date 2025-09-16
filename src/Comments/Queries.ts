import { Array, Data, Either, Equal, Option, pipe, Record } from 'effect'
import type { Uuid } from '../types/index.js'
import type { OrcidId } from '../types/OrcidId.js'
import type { InputForCommentZenodoRecord } from './Context.js'
import * as Errors from './Errors.js'
import type { CommentEvent, CommentWasAssignedADoi, PublicationOfCommentWasRequested } from './Events.js'
import { EvolveComment } from './Evolve.js'
import * as ExpectedCommand from './ExpectedCommand.js'
import { CommentNotStarted, type CommentState } from './State.js'

export const GetPrereviewId = (eventsForComment: ReadonlyArray<CommentEvent>): Option.Option<number> =>
  Array.findFirst(eventsForComment, event =>
    event._tag === 'CommentWasStarted' ? Option.some(event.prereviewId) : Option.none(),
  )

export const GetNextExpectedCommandForUser =
  (events: ReadonlyArray<CommentEvent>) =>
  ({
    authorId,
    prereviewId,
  }: {
    readonly authorId: OrcidId
    readonly prereviewId: number
  }): ExpectedCommand.ExpectedCommandForUser => {
    const [commentId, comment] = pipe(
      Array.reduce(events, Record.empty<Uuid.Uuid, ReadonlyArray<CommentEvent>>(), (candidates, event) =>
        pipe(
          Record.modifyOption(candidates, event.commentId, Array.append(event)),
          Option.getOrElse(() => {
            if (
              event._tag === 'CommentWasStarted' &&
              Equal.equals(event.authorId, authorId) &&
              Equal.equals(event.prereviewId, prereviewId)
            ) {
              return Record.set(candidates, event.commentId, Array.of(event))
            }

            return candidates
          }),
        ),
      ),
      Record.map(Array.reduce(new CommentNotStarted() as CommentState, (state, event) => EvolveComment(state)(event))),
      Record.filter(state => state._tag === 'CommentInProgress' || state._tag === 'CommentReadyForPublishing'),
      Record.toEntries,
      Array.head,
      Option.getOrElse(() => [] as const),
    )

    if (!comment || !commentId) {
      return new ExpectedCommand.ExpectedToStartAComment()
    }

    if (!comment.comment) {
      return new ExpectedCommand.ExpectedToEnterAComment({ commentId })
    }

    if (!comment.persona) {
      return new ExpectedCommand.ExpectedToChooseAPersona({ commentId })
    }

    if (!comment.competingInterests) {
      return new ExpectedCommand.ExpectedToDeclareCompetingInterests({ commentId })
    }

    if (comment._tag === 'CommentInProgress' && !comment.codeOfConductAgreed) {
      return new ExpectedCommand.ExpectedToAgreeToCodeOfConduct({ commentId })
    }

    if (comment._tag === 'CommentInProgress' && !comment.verifiedEmailAddressExists) {
      return new ExpectedCommand.ExpectedToVerifyEmailAddress({ commentId })
    }

    return new ExpectedCommand.ExpectedToPublishComment({ commentId })
  }

export const GetNextExpectedCommandForUserOnAComment =
  (events: ReadonlyArray<CommentEvent>) =>
  (
    commentId: Uuid.Uuid,
  ): Either.Either<
    Exclude<ExpectedCommand.ExpectedCommandForUser, ExpectedCommand.ExpectedToStartAComment>,
    Errors.CommentHasNotBeenStarted | Errors.CommentIsBeingPublished | Errors.CommentWasAlreadyPublished
  > => {
    const comment = Array.reduce(events, new CommentNotStarted() as CommentState, (state, event) =>
      EvolveComment(state)(event),
    )

    if (comment._tag === 'CommentNotStarted') {
      return Either.left(new Errors.CommentHasNotBeenStarted())
    }

    if (comment._tag === 'CommentBeingPublished') {
      return Either.left(new Errors.CommentIsBeingPublished())
    }

    if (comment._tag === 'CommentPublished') {
      return Either.left(new Errors.CommentWasAlreadyPublished())
    }

    if (!comment.comment) {
      return Either.right(new ExpectedCommand.ExpectedToEnterAComment({ commentId }))
    }

    if (!comment.persona) {
      return Either.right(new ExpectedCommand.ExpectedToChooseAPersona({ commentId }))
    }

    if (!comment.competingInterests) {
      return Either.right(new ExpectedCommand.ExpectedToDeclareCompetingInterests({ commentId }))
    }

    if (comment._tag === 'CommentInProgress' && !comment.codeOfConductAgreed) {
      return Either.right(new ExpectedCommand.ExpectedToAgreeToCodeOfConduct({ commentId }))
    }

    if (comment._tag === 'CommentInProgress' && !comment.verifiedEmailAddressExists) {
      return Either.right(new ExpectedCommand.ExpectedToVerifyEmailAddress({ commentId }))
    }

    return Either.right(new ExpectedCommand.ExpectedToPublishComment({ commentId }))
  }

export const buildInputForCommentZenodoRecord = (
  events: ReadonlyArray<CommentEvent>,
): Either.Either<InputForCommentZenodoRecord, UnexpectedSequenceOfEvents> => {
  const authorId = pipe(
    events,
    Array.findLast(event => event._tag === 'CommentWasStarted'),
    Option.map(event => event.authorId),
  )
  const prereviewId = pipe(
    events,
    Array.findLast(event => event._tag === 'CommentWasStarted'),
    Option.map(event => event.prereviewId),
  )
  const persona = pipe(
    events,
    Array.findLast(event => event._tag === 'PersonaForCommentWasChosen'),
    Option.map(event => event.persona),
  )
  const comment = pipe(
    events,
    Array.findLast(event => event._tag === 'CommentWasEntered'),
    Option.map(event => event.comment),
  )
  const competingInterests = pipe(
    events,
    Array.findLast(event => event._tag === 'CompetingInterestsForCommentWereDeclared'),
    Option.map(event => event.competingInterests),
  )

  return Either.fromOption(
    Option.all({ authorId, prereviewId, persona, comment, competingInterests }),
    () => new UnexpectedSequenceOfEvents(),
  )
}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents') {}
export class NoCommentsInNeedOfADoi extends Data.TaggedClass('NoCommentsInNeedOfADoi') {}

export const GetACommentInNeedOfADoi = (
  events: ReadonlyArray<PublicationOfCommentWasRequested | CommentWasAssignedADoi>,
): Either.Either<Uuid.Uuid, NoCommentsInNeedOfADoi> => {
  const hasADoi = new Set()

  for (const event of events.toReversed()) {
    if (event._tag === 'CommentWasAssignedADoi') {
      hasADoi.add(event.commentId)
      continue
    }

    if (!hasADoi.has(event.commentId)) {
      return Either.right(event.commentId)
    }
  }

  return Either.left(new NoCommentsInNeedOfADoi())
}
