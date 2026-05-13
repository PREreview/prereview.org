import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly optedOutAt: Temporal.Instant
}

type State = PrereviewerHasOptedIn | PrereviewerHasOptedOut | PrereviewerHasNotOptedIn | UnknownPrereviewer

class PrereviewerHasOptedIn extends Data.TaggedClass('PrereviewerHasOptedIn')<{
  optedInAt: Temporal.Instant
}> {}

class PrereviewerHasOptedOut extends Data.TaggedClass('PrereviewerHasOptedOut') {}

export class PrereviewerHasNotOptedIn extends Data.TaggedClass('PrereviewerHasNotOptedIn') {}

export type Error = PrereviewerHasNotOptedIn | UnknownPrereviewer

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer') {}

export declare const OptOutOfNotificationsForReviewsPublishedInResponseToRequests: Commands.Command<
  | 'RegisteredPrereviewerImported'
  | 'PrereviewerRegistered'
  | 'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests'
  | 'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
  [Input],
  State,
  Error
>
