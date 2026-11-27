import { Effect, pipe } from 'effect'
import type { Doi } from '../../../types/Doi.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { Queries, type StatefulQueries } from '../../Events/index.ts'
import { Query } from './Query.ts'
import type { CommentIsNotFound } from './Types.ts'

export type GetCommentIdForADoi = (doi: Doi) => Effect.Effect<Uuid, CommentIsNotFound | Queries.UnableToQuery>

export const GetCommentIdForADoi: Effect.Effect<GetCommentIdForADoi, never, StatefulQueries.StatefulQueries> =
  Effect.gen(function* () {
    const query = yield* Queries.makeStatefulQuery(Query)

    return (doi: Doi) => pipe(query(doi), Effect.withSpan('Comments.getCommentIdForADoi', { attributes: { doi } }))
  })
