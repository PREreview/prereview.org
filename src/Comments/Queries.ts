import { Array, Equal, Option, pipe, Record } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Uuid } from '../types/index.js'
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

export const HasAuthorUnpublishedCommentsForAPrereview =
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
      Record.some(
        state =>
          state._tag === 'CommentInProgress' ||
          state._tag === 'CommentReadyForPublishing' ||
          state._tag === 'CommentBeingPublished',
      ),
    )
