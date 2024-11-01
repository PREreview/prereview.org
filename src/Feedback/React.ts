import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkFeedbackAsPublished } from './Commands.js'
import { GetFeedback, HandleFeedbackCommand, PublishFeedbackWithADoi, UnableToHandleCommand } from './Context.js'

type ToDo = unknown

export const OnFeedbackPublicationWasRequested = (
  feedbackId: Uuid.Uuid,
): Effect.Effect<void, ToDo, GetFeedback | HandleFeedbackCommand | PublishFeedbackWithADoi> =>
  Effect.gen(function* () {
    const getFeedback = yield* GetFeedback
    const handleCommand = yield* HandleFeedbackCommand
    const publishFeedback = yield* PublishFeedbackWithADoi

    const feedback = yield* getFeedback(feedbackId)
    yield* Effect.logDebug('Got Feedback')

    if (feedback._tag !== 'FeedbackBeingPublished') {
      return
    }

    const [doi, id] = yield* publishFeedback(feedback)
    yield* Effect.logDebug('Published feedback')

    yield* Effect.mapError(
      handleCommand({
        feedbackId,
        command: new MarkFeedbackAsPublished({ id, doi }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
