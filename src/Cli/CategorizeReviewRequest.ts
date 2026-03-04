import { Args, Command, Options } from '@effect/cli'
import { Console, Effect, pipe } from 'effect'
import { OpenAlexWorks } from '../ExternalInteractions/index.ts'
import * as Preprints from '../Preprints/index.ts'
import * as ReviewRequests from '../ReviewRequests/index.ts'
import { Uuid } from '../types/index.ts'

const reviewRequestId = pipe(Args.text({ name: 'reviewRequestId' }), Args.withSchema(Uuid.UuidSchema))

const dryRun = Options.boolean('dry-run', { ifPresent: true })

const program = Effect.fnUntraced(function* ({
  dryRun,
  reviewRequestId,
}: {
  dryRun: boolean
  reviewRequestId: Uuid.Uuid
}) {
  const reviewRequest = yield* ReviewRequests.getPublishedReviewRequest({ reviewRequestId })

  const { preprint, categories } = yield* Effect.all(
    {
      preprint: Preprints.getPreprintTitle(reviewRequest.preprintId),
      categories: OpenAlexWorks.getCategoriesForAReviewRequest(reviewRequest.preprintId),
    },
    { concurrency: 'inherit' },
  )

  if (dryRun) {
    return yield* Console.log({
      language: preprint.language,
      keywords: categories.keywords,
      topics: categories.topics,
      reviewRequestId: reviewRequest.id,
    })
  }

  yield* ReviewRequests.categorizeReviewRequest({
    language: preprint.language,
    keywords: categories.keywords,
    topics: categories.topics,
    reviewRequestId: reviewRequest.id,
  })
})

export const CategorizeReviewRequest = Command.make('categorize-review-request', { dryRun, reviewRequestId }, program)
