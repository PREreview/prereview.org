import type { OrcidId, Temporal } from '../../types/index.ts'
import * as Events from '../Events/index.ts'
import { Commands } from '../Events/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly prereviewId: number
  readonly sentAt: Temporal.Instant
}

export const RecordEmailSentToNotifyPrereviewerOfAPrereview = Commands.StatelessCommand({
  name: 'PreprintReviews.recordEmailSentToNotifyPrereviewerOfAPrereview',
  decide: (input: Input) => new Events.EmailToNotifyPrereviewerOfAPrereviewWasSent(input),
})
