import { Data, Effect, flow } from 'effect'
import { Slack } from '../../../ExternalApis/index.ts'
import { shareAReviewChannelId } from '../ChannelIds.ts'
import { DatasetReviewToChatPostMessageInput } from './DatasetReviewToChatPostMessageInput.ts'

export type { DatasetReview } from './DatasetReviewToChatPostMessageInput.ts'

export class FailedToShareDatasetReview extends Data.TaggedError('FailedToShareDatasetReview')<{
  cause?: unknown
}> {}

export const ShareDatasetReview = flow(
  DatasetReviewToChatPostMessageInput,
  Effect.succeed,
  Effect.bind('channel', () => shareAReviewChannelId),
  Effect.andThen(Slack.chatPostMessage),
  Effect.catchAll(error => new FailedToShareDatasetReview({ cause: error })),
  Effect.asVoid,
)
