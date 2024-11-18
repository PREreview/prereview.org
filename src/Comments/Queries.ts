import { Array, Equal, Option, pipe, Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
import type { CommentCommand } from './Commands.js'
import type { CommentEvent } from './Events.js'
import { EvolveComment } from './Evolve.js'
import { CommentNotStarted, type CommentState } from './State.js'

export const GetAllUnpublishedCommentsByAnAuthorForAPrereview =
  (events: ReadonlyArray<{ readonly event: CommentEvent; readonly resourceId: Uuid.Uuid }>) =>
  ({ authorId, prereviewId }: { readonly authorId: Orcid; readonly prereviewId: number }) =>
    pipe(
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
        Array.reduce(new CommentNotStarted() as CommentState, (state, event) => EvolveComment(false)(state)(event)),
      ),
      Record.filter(
        state =>
          state._tag === 'CommentInProgress' ||
          state._tag === 'CommentReadyForPublishing' ||
          state._tag === 'CommentBeingPublished',
      ),
    )

export const GetNextExpectedCommandForUser =
  (events: ReadonlyArray<{ readonly event: CommentEvent; readonly resourceId: Uuid.Uuid }>) =>
  ({
    authorId,
    prereviewId,
  }: {
    readonly authorId: Orcid
    readonly prereviewId: number
  }): Exclude<CommentCommand['_tag'], 'MarkDoiAsAssigned' | 'MarkCommentAsPublished'> => {
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
        Array.reduce(new CommentNotStarted() as CommentState, (state, event) => EvolveComment(false)(state)(event)),
      ),
      Record.filter(state => state._tag === 'CommentInProgress' || state._tag === 'CommentReadyForPublishing'),
      Record.toEntries,
      Array.head,
      Option.getOrElse(() => [] as const),
    )

    if (!comment || !commentId) {
      return 'StartComment'
    }

    if (!comment.comment) {
      return 'EnterComment'
    }

    if (!comment.persona) {
      return 'ChoosePersona'
    }

    if (!comment.competingInterests) {
      return 'DeclareCompetingInterests'
    }

    if (comment._tag === 'CommentInProgress' && !comment.codeOfConductAgreed) {
      return 'AgreeToCodeOfConduct'
    }

    return 'PublishComment'
  }
