import { Data, type Effect } from 'effect'
import type { Slack } from '../../../ExternalApis/index.ts'
import type { CommunitySlackChannelIds } from '../ChannelIds.ts'
import type { PreprintReviewRequest } from './PreprintReviewRequestToChatPostMessageInput.ts'

export type { PreprintReviewRequest } from './PreprintReviewRequestToChatPostMessageInput.ts'

export class FailedToSharePreprintReviewRequest extends Data.TaggedError('FailedToSharePreprintReviewRequest')<{
  cause?: unknown
}> {}

export const SharePreprintReviewRequest: (
  reviewRequest: PreprintReviewRequest,
) => Effect.Effect<void, FailedToSharePreprintReviewRequest, CommunitySlackChannelIds | Slack.Slack> = () =>
  new FailedToSharePreprintReviewRequest({ cause: 'not implemented' })
