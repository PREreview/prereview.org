import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly prereviewId: number
}

export type Result = boolean

export declare const HasAPrereviewerBeenNotifiedOfAReview: Queries.OnDemandQuery<
  'EmailToNotifyPrereviewerOfAPrereviewWasSent',
  [Input],
  Result
>
