import type * as Commands from '../Commands.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly prereviewId: number
  readonly sentAt: Temporal.Instant
}

export declare const RecordEmailSentToNotifyPrereviewerOfAPrereview: Commands.StatelessCommand<[Input]>
