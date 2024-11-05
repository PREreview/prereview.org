import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkDoiAsAssigned, MarkFeedbackAsPublished } from './Commands.js'
import {
  AssignFeedbackADoi,
  GetFeedback,
  HandleFeedbackCommand,
  PublishFeedbackWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { DoiWasAssigned, FeedbackPublicationWasRequested } from './Events.js'

type ToDo = unknown

export const OnFeedbackPublicationWasRequested = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
  event: FeedbackPublicationWasRequested
}): Effect.Effect<void, ToDo, GetFeedback | HandleFeedbackCommand | AssignFeedbackADoi> =>
  Effect.gen(function* () {
    const getFeedback = yield* GetFeedback
    const handleCommand = yield* HandleFeedbackCommand
    const assignFeedbackADoi = yield* AssignFeedbackADoi

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackBeingPublished') {
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
        command: new MarkFeedbackAsPublished(),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
