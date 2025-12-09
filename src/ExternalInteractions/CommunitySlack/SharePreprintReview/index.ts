import { Data, Effect, flow } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import { shareAReviewChannelId } from '../ChannelIds.ts'
import { PreprintReviewToChatPostMessageInput } from './PreprintReviewToChatPostMessageInput.ts'

export type { PreprintReview } from './PreprintReviewToChatPostMessageInput.ts'

export class FailedToSharePreprintReview extends Data.TaggedError('FailedToSharePreprintReview')<{
  cause?: unknown
}> {}

export const SharePreprintReview = flow(
  PreprintReviewToChatPostMessageInput,
  Effect.succeed,
  Effect.bind('channel', () => shareAReviewChannelId),
  Effect.andThen(Slack.chatPostMessage),
  Effect.catchAll(error => new FailedToSharePreprintReview({ cause: error })),
  Effect.asVoid,
)
