import { Data, Effect, Exit, flow } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import { requestAReviewChannelId } from '../ChannelIds.ts'
import { PreprintReviewRequestToChatPostMessageInput } from './PreprintReviewRequestToChatPostMessageInput.ts'

export type { PreprintReviewRequest } from './PreprintReviewRequestToChatPostMessageInput.ts'

export class FailedToSharePreprintReviewRequest extends Data.TaggedError('FailedToSharePreprintReviewRequest')<{
  cause?: unknown
}> {}

export const SharePreprintReviewRequest = flow(
  PreprintReviewRequestToChatPostMessageInput,
  Effect.bind('channel', () => requestAReviewChannelId),
  Effect.andThen(Slack.chatPostMessage),
  Effect.acquireRelease((id, exit) =>
    Exit.matchEffect(exit, {
      onFailure: () =>
        Effect.catchAll(Slack.chatDelete(id), error =>
          Effect.logError('Unable to delete Slack message').pipe(Effect.annotateLogs({ id, error })),
        ),
      onSuccess: () => Effect.void,
    }),
  ),
  Effect.catchAll(error => new FailedToSharePreprintReviewRequest({ cause: error })),
  Effect.andThen(message => ({ channelId: message.channel, messageTimestamp: message.ts })),
)
