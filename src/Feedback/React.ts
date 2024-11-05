import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkFeedbackAsPublished } from './Commands.js'
import {
  AssignFeedbackADoi,
  GetFeedback,
  HandleFeedbackCommand,
  PublishFeedbackWithADoi,
  UnableToHandleCommand,
} from './Context.js'
import type { FeedbackPublicationWasRequested } from './Events.js'

type ToDo = unknown

export const OnFeedbackPublicationWasRequested = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
  event: FeedbackPublicationWasRequested
}): Effect.Effect<void, ToDo, GetFeedback | HandleFeedbackCommand | AssignFeedbackADoi | PublishFeedbackWithADoi> =>
  Effect.gen(function* () {
    const getFeedback = yield* GetFeedback
    const handleCommand = yield* HandleFeedbackCommand
    const assignFeedbackADoi = yield* AssignFeedbackADoi
    const publishFeedback = yield* PublishFeedbackWithADoi

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackBeingPublished') {
      return
    }

    const [doi, id] = yield* assignFeedbackADoi(feedback)

    yield* publishFeedback(id)

    yield* Effect.mapError(
      handleCommand({
        feedbackId,
        command: new MarkFeedbackAsPublished({ id, doi }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
