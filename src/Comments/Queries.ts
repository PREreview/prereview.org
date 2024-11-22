import { Array, Either, Equal, Option, pipe, Record } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { html } from '../html.js'
import type { Uuid } from '../types/index.js'
import type { InputForCommentZenodoRecord } from './Context.js'
import * as Errors from './Errors.js'
import type { CommentEvent } from './Events.js'
import { EvolveComment } from './Evolve.js'
import * as ExpectedCommand from './ExpectedCommand.js'
import { CommentNotStarted, type CommentState } from './State.js'

export const GetNextExpectedCommandForUser =
  (requireVerifiedEmailAddress: boolean) =>
  (events: ReadonlyArray<{ readonly event: CommentEvent; readonly resourceId: Uuid.Uuid }>) =>
  ({
    authorId,
    prereviewId,
  }: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }): ExpectedCommand.ExpectedCommandForUser => {
    const [commentId, comment] = pipe(
      Array.reduce(
        events,
        {} as Record.ReadonlyRecord<Uuid.Uuid, ReadonlyArray<CommentEvent>>,
        (candidates, { event, resourceId }) =>
          pipe(
            Record.modifyOption(candidates, resourceId, Array.append(event)),
            Option.getOrElse(() => {
              if (
                event._tag === 'CommentWasStarted' &&
                Equal.equals(event.authorId, authorId) &&
                Equal.equals(event.prereviewId, prereviewId)
              ) {
                return Record.set(candidates, resourceId, Array.of(event))
              }

              return candidates
            }),
          ),
      ),
      Record.map(
        Array.reduce(new CommentNotStarted() as CommentState, (state, event) =>
          EvolveComment(requireVerifiedEmailAddress)(state)(event),
        ),
      ),
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

    if (requireVerifiedEmailAddress && comment._tag === 'CommentInProgress' && !comment.verifiedEmailAddressExists) {
      return new ExpectedCommand.ExpectedToVerifyEmailAddress({ commentId })
    }

    return new ExpectedCommand.ExpectedToPublishComment({ commentId })
  }

export const GetNextExpectedCommandForUserOnAComment =
  (requireVerifiedEmailAddress: boolean) =>
  (events: ReadonlyArray<{ readonly event: CommentEvent; readonly resourceId: Uuid.Uuid }>) =>
  (
    commentId: Uuid.Uuid,
  ): Either.Either<
    Exclude<ExpectedCommand.ExpectedCommandForUser, ExpectedCommand.ExpectedToStartAComment>,
    Errors.CommentHasNotBeenStarted | Errors.CommentIsBeingPublished | Errors.CommentWasAlreadyPublished
  > => {
    const comment = Array.reduce(events, new CommentNotStarted() as CommentState, (state, { event, resourceId }) =>
      resourceId === commentId ? EvolveComment(requireVerifiedEmailAddress)(state)(event) : state,
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

    if (requireVerifiedEmailAddress && comment._tag === 'CommentInProgress' && !comment.verifiedEmailAddressExists) {
      return Either.right(new ExpectedCommand.ExpectedToVerifyEmailAddress({ commentId }))
    }

    return Either.right(new ExpectedCommand.ExpectedToPublishComment({ commentId }))
  }

export const GetACommentInNeedOfADoi = (
  events: ReadonlyArray<{ readonly event: CommentEvent; readonly resourceId: Uuid.Uuid }>,
): Option.Option<{
  commentId: Uuid.Uuid
  inputForCommentZenodoRecord: InputForCommentZenodoRecord
}> => {
  const hasADoi = new Set()
  const stubbedData: InputForCommentZenodoRecord = {
    authorId: Orcid('0000-0002-1825-0097'),
    competingInterests: Option.none(),
    comment: html``,
    persona: 'public',
    prereviewId: 0,
  }

  for (const { event, resourceId } of events.toReversed()) {
    if (event._tag === 'DoiWasAssigned') {
      hasADoi.add(resourceId)
      continue
    }

    if (event._tag === 'CommentPublicationWasRequested' && !hasADoi.has(resourceId)) {
      return Option.some({ commentId: resourceId, inputForCommentZenodoRecord: stubbedData })
    }
  }

  return Option.none()
}
