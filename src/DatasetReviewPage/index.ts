import { Effect } from 'effect'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import type { Uuid } from '../types/index.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DatasetReviewPage = Effect.fn(function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
  return yield* HavingProblemsPage
})
