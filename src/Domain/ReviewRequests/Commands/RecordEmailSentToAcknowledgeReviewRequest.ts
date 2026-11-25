import type { Temporal, Uuid } from '../../../types/index.ts'
import * as Events from '../../Events/index.ts'

export interface Command {
  readonly reviewRequestId: Uuid.Uuid
  readonly sentAt: Temporal.Instant
}

export const decide = (command: Command): Events.ReviewRequestEvent => {
  return new Events.EmailToAcknowledgeAReviewRequestForAPreprintWasSent(command)
}
