import { Context, Effect, pipe, Scope } from 'effect'
import type * as EventStore from '../../../EventStore.ts'
import * as Queries from '../../../Queries.ts'
import type { Clubs } from '../../Clubs/index.ts'
import type { Preprints } from '../../Preprints/index.ts'
import type { Prereviewers } from '../../Prereviewers/index.ts'
import { Enrich } from './Enrich.ts'
import { Query } from './Query.ts'
import { WasAReviewRequested } from './WasAReviewRequested.ts'
import {
  type PrereviewIsNotFound,
  PrereviewIsUnavailable,
  type PrereviewWasRemoved,
  type PublishedPreprintReview,
} from './Types.ts'
import type { EventDispatcher } from '../../../EventDispatcher.ts'

export type GetPublishedPreprintReview = (
  id: number,
) => Effect.Effect<PublishedPreprintReview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>

export const GetPublishedPreprintReview: Effect.Effect<
  GetPublishedPreprintReview,
  never,
  Clubs | EventDispatcher | EventStore.EventStore | Preprints | Prereviewers
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<Clubs | Preprints | Prereviewers>(), Context.omit(Scope.Scope))

  const query = yield* Queries.makeOnDemandQuery(Query([]))
  const wasAReviewRequested = yield* Queries.makeStatefulQuery(WasAReviewRequested)

  return (id: number) =>
    pipe(
      query(id),
      Effect.andThen(Enrich(wasAReviewRequested)),
      Effect.catchTag(
        ['ClubNotFound', 'UnableToQuery', 'UnableToGetPersona', 'PreprintIsNotFound', 'PreprintIsUnavailable'],
        error => new PrereviewIsUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('PreprintReviews.getPublishedPreprintReview', { attributes: { preprintReviewId: id } }),
    )
})
