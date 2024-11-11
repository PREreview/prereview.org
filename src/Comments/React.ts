import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.js'
import {
  AssignCommentADoi,
  GetComment,
  HandleCommentCommand,
  PublishCommentWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { CommentPublicationWasRequested, DoiWasAssigned } from './Events.js'

type ToDo = unknown

export const OnCommentPublicationWasRequested = ({
  commentId,
}: {
  commentId: Uuid.Uuid
  event: CommentPublicationWasRequested
}): Effect.Effect<void, ToDo, GetComment | HandleCommentCommand | AssignCommentADoi> =>
  Effect.gen(function* () {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const assignCommentADoi = yield* AssignCommentADoi

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentBeingPublished') {
      return
    }

    const [doi, id] = yield* assignCommentADoi(comment)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkDoiAsAssigned({ doi, id }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })

export const OnDoiWasAssigned = ({
  commentId,
  event,
}: {
  commentId: Uuid.Uuid
  event: DoiWasAssigned
}): Effect.Effect<void, ToDo, HandleCommentCommand | PublishCommentWithADoi> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const publishComment = yield* PublishCommentWithADoi

    yield* publishComment(event.id)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkCommentAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
