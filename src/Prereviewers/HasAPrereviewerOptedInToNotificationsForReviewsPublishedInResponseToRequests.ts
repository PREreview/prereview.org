import { Data, type Either } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = Either.Either<HasNotOptedIn | HasOptedIn | HasOptedOut, UnknownPrereviewer>

export class HasNotOptedIn extends Data.TaggedClass('HasNotOptedIn') {}

export class HasOptedIn extends Data.TaggedClass('HasOptedIn') {}

export class HasOptedOut extends Data.TaggedClass('HasOptedOut') {}

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer')<{ cause?: unknown }> {}

export declare const HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests: Queries.OnDemandQuery<
  | 'RegisteredPrereviewerImported'
  | 'PrereviewerRegistered'
  | 'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests'
  | 'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
