import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.js'
import {
  AssignFeedbackADoi,
  GetComment,
  HandleCommentCommand,
  PublishFeedbackWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { CommentPublicationWasRequested, DoiWasAssigned } from './Events.js'

type ToDo = unknown

export const OnCommentPublicationWasRequested = ({
  commentId,
}: {
  commentId: Uuid.Uuid
  event: CommentPublicationWasRequested
}): Effect.Effect<void, ToDo, GetComment | HandleCommentCommand | AssignFeedbackADoi> =>
  Effect.gen(function* () {
    const getComment = yield* GetComment
    const handleCommand = yield* HandleCommentCommand
    const assignFeedbackADoi = yield* AssignFeedbackADoi

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentBeingPublished') {
      return
    }

    const [doi, id] = yield* assignFeedbackADoi(comment)

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
}): Effect.Effect<void, ToDo, HandleCommentCommand | PublishFeedbackWithADoi> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleCommentCommand
    const publishFeedback = yield* PublishFeedbackWithADoi

    yield* publishFeedback(event.id)

    yield* Effect.mapError(
      handleCommand({
        commentId,
        command: new MarkCommentAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
