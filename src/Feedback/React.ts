import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkCommentAsPublished, MarkDoiAsAssigned } from './Commands.js'
import {
  AssignFeedbackADoi,
  GetFeedback,
  HandleFeedbackCommand,
  PublishFeedbackWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { CommentPublicationWasRequested, DoiWasAssigned } from './Events.js'

type ToDo = unknown

export const OnFeedbackPublicationWasRequested = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
  event: CommentPublicationWasRequested
}): Effect.Effect<void, ToDo, GetFeedback | HandleFeedbackCommand | AssignFeedbackADoi> =>
  Effect.gen(function* () {
    const getFeedback = yield* GetFeedback
    const handleCommand = yield* HandleFeedbackCommand
    const assignFeedbackADoi = yield* AssignFeedbackADoi

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'CommentBeingPublished') {
      return
    }

    const [doi, id] = yield* assignFeedbackADoi(feedback)

    yield* Effect.mapError(
      handleCommand({
        feedbackId,
        command: new MarkDoiAsAssigned({ doi, id }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })

export const OnDoiWasAssigned = ({
  feedbackId,
  event,
}: {
  feedbackId: Uuid.Uuid
  event: DoiWasAssigned
}): Effect.Effect<void, ToDo, HandleFeedbackCommand | PublishFeedbackWithADoi> =>
  Effect.gen(function* () {
    const handleCommand = yield* HandleFeedbackCommand
    const publishFeedback = yield* PublishFeedbackWithADoi

    yield* publishFeedback(event.id)

    yield* Effect.mapError(
      handleCommand({
        feedbackId,
        command: new MarkCommentAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
