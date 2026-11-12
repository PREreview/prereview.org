import type * as Queries from '../Queries.ts'
import type { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from './Prereview.ts'

export type Result = Prereview

export type Error = PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved

export declare const GetPublishedPreprintReview: (
  removedPreprintReviewIds: ReadonlyArray<number>,
) => Queries.OnDemandQuery<[number], Result, Error>
