import { Activity, Workflow } from '@effect/workflow'
import { flow, Layer, Struct } from 'effect'
import { UuidSchema } from '../../types/Uuid.ts'
import {
  SendAuthorInviteEmails as executeSendAuthorInviteEmails,
  FailedToSendAuthorInviteEmails,
} from './SendAuthorInviteEmails.ts'

export const SendAuthorInviteEmails = Workflow.make({
  name: 'SendAuthorInviteEmails',
  error: FailedToSendAuthorInviteEmails,
  payload: {
    reviewId: UuidSchema,
  },
  idempotencyKey: flow(Struct.get('reviewId'), String),
})

export const workflowsLayer = Layer.mergeAll(
  SendAuthorInviteEmails.toLayer(({ reviewId }) =>
    Activity.make({
      name: SendAuthorInviteEmails.name,
      error: SendAuthorInviteEmails.errorSchema,
      execute: executeSendAuthorInviteEmails(reviewId),
    }),
  ),
)
