import { Effect, pipe } from 'effect'
import { Locale } from '../../Context.ts'
import * as FeatureFlags from '../../FeatureFlags.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import type { PageResponse } from '../../Response/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { createPage } from './HomePage.ts'

export const HomePage: Effect.Effect<
  PageResponse,
  never,
  Prereviews.Prereviews | ReviewRequests.ReviewRequests | Locale | FeatureFlags.FeatureFlags
> = pipe(
  Effect.Do,
  Effect.bindAll(
    () => ({
      locale: Locale,
      recentPrereviews: Prereviews.getFiveMostRecent,
      recentReviewRequests: ReviewRequests.getFiveMostRecent,
      canReviewDatasets: FeatureFlags.canReviewDatasets,
    }),
    { concurrency: 'inherit' },
  ),
  Effect.let('statistics', () => ({ prereviews: 1588, servers: 31, users: 3940 })),
  Effect.andThen(createPage),
)
