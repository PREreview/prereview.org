import { Effect, pipe } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import type { Doi } from '../../../types/Doi.ts'
import { Query } from './Query.ts'
import type { PrereviewIsNotFound } from './Types.ts'

export type GetPreprintReviewIdForADoi = (doi: Doi) => Effect.Effect<number, PrereviewIsNotFound>

export const GetPreprintReviewIdForADoi: Effect.Effect<
  GetPreprintReviewIdForADoi,
  never,
  EventDispatcher.EventDispatcher
> = Effect.gen(function* () {
  const query = yield* Queries.makeStatefulQuery(Query)

  return (doi: Doi) =>
    pipe(query(doi), Effect.withSpan('PreprintReviews.getPreprintReviewIdForADoi', { attributes: { doi } }))
})
