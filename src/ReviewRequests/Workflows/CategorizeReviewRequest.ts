import { Effect } from 'effect'
import { OpenAlexWorks } from '../../ExternalInteractions/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const CategorizeReviewRequest = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getPublishedReviewRequest({ reviewRequestId })

    const { preprint, categories } = yield* Effect.all(
      {
        preprint: Preprints.getPreprintTitle(reviewRequest.preprintId),
        categories: OpenAlexWorks.getCategoriesForAReviewRequest(reviewRequest.preprintId),
      },
      { concurrency: 'inherit' },
    )

    yield* Commands.categorizeReviewRequest({
      language: preprint.language,
      keywords: categories.keywords,
      topics: categories.topics,
      reviewRequestId: reviewRequest.id,
    })
  },
  Effect.catchAll(error => new Errors.FailedToCategorizeReviewRequest({ cause: error })),
)
