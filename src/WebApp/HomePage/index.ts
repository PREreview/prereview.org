import { Effect, pipe } from 'effect'
import { Locale } from '../../Context.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createPage } from './HomePage.ts'

export const HomePage: Effect.Effect<
  PageResponse,
  never,
  Prereviews.Prereviews | ReviewRequests.ReviewRequests | Locale
> = pipe(
  Effect.Do,
  Effect.bindAll(
    () => ({
      locale: Locale,
      recentPrereviews: Prereviews.getFiveMostRecent,
      recentReviewRequests: ReviewRequests.getFiveMostRecent,
    }),
    { concurrency: 'inherit' },
  ),
  Effect.let('statistics', () => ({ prereviews: 1998, servers: 32, users: 4354 })),
  Effect.andThen(createPage),
)
