import { Schema } from 'effect'
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

export const ReviewRequestEvent = ReviewRequestForAPreprintWasAccepted

export const ReviewRequestEventTypes = ReviewRequestForAPreprintWasAccepted._tag
