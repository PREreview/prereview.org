import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly optedInAt: Temporal.Instant
}

type State = PrereviewerHasOptedIn | PrereviewerHasNotOptedIn | UnknownPrereviewer

class PrereviewerHasOptedIn extends Data.TaggedClass('PrereviewerHasOptedIn')<{
  optedInAt: Temporal.Instant
}> {}

class PrereviewerHasNotOptedIn extends Data.TaggedClass('PrereviewerHasNotOptedIn') {}

export type Error = UnknownPrereviewer

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer') {}

export declare const OptInToNotificationsForReviewsPublishedInResponseToRequests: Commands.Command<
  | 'RegisteredPrereviewerImported'
  | 'PrereviewerRegistered'
  | 'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
  [Input],
  State,
  Error
>
