import { Command } from 'effect/cli'
import { Array, Effect, Console, Option, Filter } from 'effect'
import { Embeddings } from '../Embeddings/index.ts'
import { ReviewRequestQueries } from '../ReviewRequests/index.ts'
import { Preprints } from '../Preprints/index.ts'

const program = Effect.fnUntraced(function* () {
  const reviewRequestQueries = yield* ReviewRequestQueries
  const preprints = yield* Preprints
  const embeddings = yield* Embeddings

  yield* Console.log('Populating')

  const reviewRequests = yield* reviewRequestQueries.listAllPublishedReviewRequestsForStats()

  const worksWithRequests = yield* Effect.forEach(
    reviewRequests,
    Effect.fnUntraced(function* (reviewRequest) {
      const preprint = yield* preprints.getPreprint(reviewRequest.preprintId)
      return {
        preprintId: preprint.id,
        title: preprint.title.text.value,
        abstract: preprint.abstract ? preprint.abstract.text.value : '',
        authors: Array.filterMap(
          preprint.authors,
          Filter.fromPredicateOption(author => Option.fromNullishOr(author.orcid)),
        ),
      }
    }),
  )

  yield* embeddings.addPreprints(worksWithRequests)
})

export const PopulateRequestEmbeddings = Command.make('populate-request-embeddings', {}, program)
