import { Console, Effect, pipe } from 'effect'
import { Argument, Command } from 'effect/cli'
import { Uuid } from '../types/index.ts'

const datasetReviewId = pipe(Argument.String('datasetReviewId'), Argument.withSchema(Uuid.UuidSchema))

const program = Effect.fnUntraced(function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
  yield* Console.log(`retrying ${datasetReviewId}`)
})

export const RetryPublishDatasetReview = Command.make('retry-publish-dataset-review', { datasetReviewId }, program)
