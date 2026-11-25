import { Effect, pipe } from 'effect'
import type { StatefulQueries } from '../../../EventSourcing/index.ts'
import type { Doi } from '../../../types/Doi.ts'
import { Queries } from '../../Events/index.ts'
import { Query } from './Query.ts'
import type { PrereviewIsNotFound } from './Types.ts'

export type GetPreprintReviewIdForADoi = (
  doi: Doi,
) => Effect.Effect<number, PrereviewIsNotFound | Queries.UnableToQuery>

export const GetPreprintReviewIdForADoi: Effect.Effect<
  GetPreprintReviewIdForADoi,
  never,
  StatefulQueries.StatefulQueries
> = Effect.gen(function* () {
  const query = yield* Queries.makeStatefulQuery(Query)

  return (doi: Doi) =>
    pipe(query(doi), Effect.withSpan('PreprintReviews.getPreprintReviewIdForADoi', { attributes: { doi } }))
})
