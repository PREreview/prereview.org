import { Data, type Effect, type Scope } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import type { CommunitySlackChannelIds } from '../ChannelIds.ts'
import type { PreprintReviewRequest } from './PreprintReviewRequestToChatPostMessageInput.ts'

export type { PreprintReviewRequest } from './PreprintReviewRequestToChatPostMessageInput.ts'

export class FailedToSharePreprintReviewRequest extends Data.TaggedError('FailedToSharePreprintReviewRequest')<{
  cause?: unknown
}> {}

export const SharePreprintReviewRequest: (
  reviewRequest: PreprintReviewRequest,
) => Effect.Effect<
  { channelId: Slack.ChannelId; messageTimestamp: Slack.Timestamp },
  FailedToSharePreprintReviewRequest,
  CommunitySlackChannelIds | Slack.Slack | Scope.Scope
> = () => new FailedToSharePreprintReviewRequest({ cause: 'not implemented' })
