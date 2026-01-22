import { Array, Schema, Struct } from 'effect'
import { Slack } from '../ExternalApis/index.ts'
import * as Preprints from '../Preprints/index.ts'
import { SensitiveData } from '../SensitiveData.ts'
import { EmailAddress, Iso639, NonEmptyString, OrcidId, SciProfilesId, Temporal, Uuid } from '../types/index.ts'
import { KeywordIdSchema } from '../types/Keyword.ts'
import { TopicIdSchema } from '../types/Topic.ts'

export type ReviewRequestEvent = typeof ReviewRequestEvent.Type

export class ReviewRequestForAPreprintWasReceived extends Schema.TaggedClass<ReviewRequestForAPreprintWasReceived>()(
  'ReviewRequestForAPreprintWasReceived',
  {
    receivedAt: Temporal.InstantSchema,
    receivedFrom: Schema.URL,
    preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
    reviewRequestId: Uuid.UuidSchema,
    requester: SensitiveData(
      Schema.Struct({
        name: NonEmptyString.NonEmptyStringSchema,
        orcidId: Schema.optional(OrcidId.OrcidIdSchema),
        sciProfilesId: Schema.optional(SciProfilesId.SciProfilesIdSchema),
        emailAddress: Schema.optional(EmailAddress.EmailAddressSchema),
      }),
    ),
  },
) {}

export class ReviewRequestForAPreprintWasAccepted extends Schema.TaggedClass<ReviewRequestForAPreprintWasAccepted>()(
  'ReviewRequestForAPreprintWasAccepted',
  {
    acceptedAt: Temporal.InstantSchema,
    reviewRequestId: Uuid.UuidSchema,
  },
) {}

export class ReviewRequestForAPreprintWasRejected extends Schema.TaggedClass<ReviewRequestForAPreprintWasRejected>()(
  'ReviewRequestForAPreprintWasRejected',
  {
    rejectedAt: Temporal.InstantSchema,
    reviewRequestId: Uuid.UuidSchema,
    reason: Schema.Literal('not-a-preprint', 'unknown-preprint'),
  },
) {}

export class ReviewRequestFromAPreprintServerWasImported extends Schema.TaggedClass<ReviewRequestFromAPreprintServerWasImported>()(
  'ReviewRequestFromAPreprintServerWasImported',
  {
    publishedAt: Temporal.InstantSchema,
    receivedFrom: Schema.URL,
    preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
    reviewRequestId: Uuid.UuidSchema,
    requester: SensitiveData(
      Schema.Struct({
        name: NonEmptyString.NonEmptyStringSchema,
        orcidId: Schema.optional(OrcidId.OrcidIdSchema),
        sciProfilesId: Schema.optional(SciProfilesId.SciProfilesIdSchema),
        emailAddress: Schema.optional(EmailAddress.EmailAddressSchema),
      }),
    ),
  },
) {}

export class ReviewRequestByAPrereviewerWasImported extends Schema.TaggedClass<ReviewRequestByAPrereviewerWasImported>()(
  'ReviewRequestByAPrereviewerWasImported',
  {
    publishedAt: Temporal.InstantSchema,
    preprintId: Preprints.IndeterminatePreprintIdFromStringSchema,
    reviewRequestId: Uuid.UuidSchema,
    requester: Schema.Struct({
      orcidId: OrcidId.OrcidIdSchema,
      persona: Schema.Literal('public', 'pseudonym'),
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
  ReviewRequestForAPreprintWasRejected,
  ReviewRequestFromAPreprintServerWasImported,
  ReviewRequestByAPrereviewerWasImported,
  ReviewRequestForAPreprintWasCategorized,
  ReviewRequestForAPreprintWasSharedOnTheCommunitySlack,
)

export const ReviewRequestEventTypes = Array.map(ReviewRequestEvent.members, Struct.get('_tag'))
