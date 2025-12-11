import { Effect, Option } from 'effect'
import { OpenAlexWorks } from '../../ExternalInteractions/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const CategorizeReviewRequest = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getPublishedReviewRequest({ reviewRequestId })

    const categories = yield* OpenAlexWorks.getCategoriesForAReviewRequest(reviewRequest.preprintId)

    if (Option.isNone(categories.language)) {
      return yield* Effect.fail('no language')
    }

    yield* Commands.categorizeReviewRequest({
      language: categories.language.value,
      keywords: categories.keywords,
      topics: categories.topics,
      reviewRequestId: reviewRequest.id,
    })
  },
  Effect.catchAll(error => new Errors.FailedToCategorizeReviewRequest({ cause: error })),
)
