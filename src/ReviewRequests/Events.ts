import { Array, Schema, Struct } from 'effect'
import { Slack } from '../ExternalApis/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { Iso639, NonEmptyString, Temporal, Uuid } from '../types/index.ts'
import { KeywordIdSchema } from '../types/Keyword.ts'
import { TopicIdSchema } from '../types/Topic.ts'

export type ReviewRequestEvent = typeof ReviewRequestEvent.Type

export class ReviewRequestForAPreprintWasReceived extends Schema.TaggedClass<ReviewRequestForAPreprintWasReceived>()(
  'ReviewRequestForAPreprintWasReceived',
  {
    receivedAt: Temporal.InstantSchema,
    preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
    reviewRequestId: Uuid.UuidSchema,
    requester: Schema.Struct({
      name: NonEmptyString.NonEmptyStringSchema,
    }),
  },
) {}

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

export class ReviewRequestForAPreprintWasCategorized extends Schema.TaggedClass<ReviewRequestForAPreprintWasCategorized>()(
  'ReviewRequestForAPreprintWasCategorized',
  {
    reviewRequestId: Uuid.UuidSchema,
    language: Iso639.Iso6391Schema,
    keywords: Schema.Array(KeywordIdSchema),
    topics: Schema.Array(TopicIdSchema),
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
  ReviewRequestForAPreprintWasReceived,
  ReviewRequestForAPreprintWasAccepted,
  ReviewRequestForAPreprintWasCategorized,
  ReviewRequestForAPreprintWasSharedOnTheCommunitySlack,
)

export const ReviewRequestEventTypes = Array.map(ReviewRequestEvent.members, Struct.get('_tag'))
