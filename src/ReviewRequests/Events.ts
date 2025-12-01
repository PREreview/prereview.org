import { Array, Schema, Struct } from 'effect'
import { Slack } from '../ExternalApis/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { NonEmptyString, Temporal, Uuid } from '../types/index.ts'

export type ReviewRequestEvent = typeof ReviewRequestEvent.Type

export class ReviewRequestForAPreprintWasAccepted extends Schema.TaggedClass<ReviewRequestForAPreprintWasAccepted>()(
  'ReviewRequestForAPreprintWasAccepted',
  {
    receivedAt: Temporal.InstantSchema,
    acceptedAt: Temporal.InstantSchema,
    preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
    reviewRequestId: Uuid.UuidSchema,
    requester: Schema.Struct({
      name: NonEmptyString.NonEmptyStringSchema,
    }),
  },
) {}

export class ReviewRequestForAPreprintWasSharedOnTheCommunitySlack extends Schema.TaggedClass<ReviewRequestForAPreprintWasSharedOnTheCommunitySlack>()(
  'ReviewRequestForAPreprintWasSharedOnTheCommunitySlack',
  {
    channelId: Slack.ChannelId,
    messageTimestamp: Slack.Timestamp,
    reviewRequestId: Uuid.UuidSchema,
  },
) {}

export const ReviewRequestEvent = Schema.Union(
  ReviewRequestForAPreprintWasAccepted,
  ReviewRequestForAPreprintWasSharedOnTheCommunitySlack,
)

export const ReviewRequestEventTypes = Array.map(ReviewRequestEvent.members, Struct.get('_tag'))
