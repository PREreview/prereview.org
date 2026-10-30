import { Command } from '@effect/cli'
import { Array, Effect, Console, Option } from 'effect'
import { ReviewRequestQueries } from '../ReviewRequests/index.ts'
import { Preprints } from '../Preprints/index.ts'

const program = Effect.fnUntraced(function* () {
  const reviewRequestQueries = yield* ReviewRequestQueries
  const preprints = yield* Preprints

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
        authors: Array.filterMap(preprint.authors, author => Option.fromNullable(author.orcid)),
      }
    }),
  )

  yield* Console.log(worksWithRequests)
})

export const PopulateRequestEmbeddings = Command.make('populate-request-embeddings', {}, program)
