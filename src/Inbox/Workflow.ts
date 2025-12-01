import { Activity, Workflow } from '@effect/workflow'
import { Layer, Schema, Struct } from 'effect'
import { CoarNotify } from '../ExternalApis/index.ts'
import { Temporal, Uuid } from '../types/index.ts'
import * as Errors from './Errors.ts'
import { ProcessCoarNotifyMessage as executeProcessCoarNotifyMessage } from './ProcessCoarNotifyMessage.ts'

export const ProcessCoarNotifyMessage = Workflow.make({
  name: 'ProcessCoarNotifyMessage',
  error: Schema.Union(Errors.RejectedRequestReview, Errors.FailedToProcessRequestReview),
  payload: {
    message: CoarNotify.RequestReviewSchema,
    messageId: Uuid.UuidSchema,
    receivedAt: Temporal.InstantSchema,
  },
  idempotencyKey: Struct.get('messageId'),
})

export const layer = Layer.mergeAll(
  ProcessCoarNotifyMessage.toLayer(payload =>
    Activity.make({
      name: ProcessCoarNotifyMessage.name,
      error: ProcessCoarNotifyMessage.errorSchema,
      execute: executeProcessCoarNotifyMessage(payload),
    }),
  ),
)
