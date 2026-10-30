import { Command } from '@effect/cli'
import { Effect, Array, Console } from 'effect'
import { ReviewRequestQueries } from '../ReviewRequests/index.ts'

const program = Effect.fnUntraced(function* () {
  const reviewRequestQueries = yield* ReviewRequestQueries

  yield* Console.log('Populating')

  const reviewRequests = yield* reviewRequestQueries.listAllPublishedReviewRequestsForStats()

  const worksWithRequests = Array.map(reviewRequests, reviewRequest => ({
    preprintId: reviewRequest.preprintId,
    title: 'title',
    abstract: 'abstract',
    authors: [],
  }))

  yield* Console.log(worksWithRequests)
})

export const PopulateRequestEmbeddings = Command.make('populate-request-embeddings', {}, program)
