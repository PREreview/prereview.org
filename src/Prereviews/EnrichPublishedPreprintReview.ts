import type { Effect } from 'effect'
import type { Result as PublishedPreprintReview } from './GetPublishedPreprintReview.ts'
import type { Prereview, PrereviewIsUnavailable } from './Prereview.ts'

export declare const EnrichPublishedPreprintReview: (
  publishedPreprintReview: PublishedPreprintReview,
) => Effect.Effect<Prereview, PrereviewIsUnavailable>
