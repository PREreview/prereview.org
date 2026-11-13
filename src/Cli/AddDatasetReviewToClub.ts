import { Argument, Command } from 'effect/cli'
import { Effect, pipe } from 'effect'
import { Clubs } from '../Domain/Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import { Uuid } from '../types/index.ts'
import { type Slug, SlugSchema } from '../types/Slug.ts'

const datasetReviewId = pipe(Argument.String('datasetReviewId'), Argument.withSchema(Uuid.UuidSchema))

const clubSlug = pipe(Argument.String('clubSlug'), Argument.withSchema(SlugSchema))

const program = Effect.fnUntraced(function* ({
  datasetReviewId,
  clubSlug,
}: {
  datasetReviewId: Uuid.Uuid
  clubSlug: Slug
}) {
  const clubs = yield* Clubs

  const club = yield* clubs.getClubBySlug(clubSlug)

  yield* DatasetReviews.addReviewToAClub({ datasetReviewId, clubId: club.id })
})

export const AddDatasetReviewToClub = Command.make('add-dataset-review-to-club', { datasetReviewId, clubSlug }, program)
