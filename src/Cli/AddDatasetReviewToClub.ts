import { Args, Command } from '@effect/cli'
import { Effect, pipe } from 'effect'
import * as Clubs from '../Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import { Uuid } from '../types/index.ts'

const datasetReviewId = pipe(Args.text({ name: 'datasetReviewId' }), Args.withSchema(Uuid.UuidSchema))

const clubId = pipe(Args.text({ name: 'clubId' }), Args.withSchema(Clubs.ClubIdSchema))

const program = Effect.fnUntraced(function* ({
  datasetReviewId,
  clubId,
}: {
  datasetReviewId: Uuid.Uuid
  clubId: Clubs.ClubId
}) {
  yield* DatasetReviews.addReviewToAClub({ datasetReviewId, clubId })
})

export const AddDatasetReviewToClub = Command.make('add-dataset-review-to-club', { datasetReviewId, clubId }, program)
