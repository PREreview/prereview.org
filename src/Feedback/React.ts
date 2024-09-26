import { Effect } from 'effect'
import type { Uuid } from '../types/index.js'
import { MarkFeedbackAsPublished } from './Commands.js'
import { GetFeedback, HandleFeedbackCommand, PublishFeedbackWithADoi, UnableToHandleCommand } from './Context.js'
import type { FeedbackPublicationWasRequested } from './Events.js'

export const OnFeedbackPublicationWasRequested = ({
  feedbackId,
}: {
  feedbackId: Uuid.Uuid
  event: FeedbackPublicationWasRequested
}) =>
  Effect.gen(function* () {
    const getFeedback = yield* GetFeedback
    const handleCommand = yield* HandleFeedbackCommand
    const publishFeedback = yield* PublishFeedbackWithADoi

    const feedback = yield* getFeedback(feedbackId)

    if (feedback._tag !== 'FeedbackBeingPublished') {
      return
    }

    const [doi, id] = yield* publishFeedback(feedback)

    yield* Effect.mapError(
      handleCommand({
        feedbackId,
        command: new MarkFeedbackAsPublished({ id, doi }),
      }),
      error => (error._tag !== 'UnableToHandleCommand' ? new UnableToHandleCommand({ cause: error }) : error),
    )
  })
