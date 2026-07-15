import { Args, Command } from '@effect/cli'
import { Effect, pipe } from 'effect'
import { Clubs, isClubId } from '../Clubs/index.ts'
import * as DatasetReviews from '../DatasetReviews/index.ts'
import { Uuid } from '../types/index.ts'
import { type Slug, SlugSchema } from '../types/Slug.ts'

const datasetReviewId = pipe(Args.text({ name: 'datasetReviewId' }), Args.withSchema(Uuid.UuidSchema))

const clubSlug = pipe(Args.text({ name: 'clubSlug' }), Args.withSchema(SlugSchema))

const program = Effect.fnUntraced(function* ({
  datasetReviewId,
  clubSlug,
}: {
  datasetReviewId: Uuid.Uuid
  clubSlug: Slug
}) {
  const clubs = yield* Clubs

  const club = yield* clubs.getClubBySlug(clubSlug)

  if (!isClubId(club.id)) {
    return yield* Effect.die('not a club ID')
  }

  yield* DatasetReviews.addReviewToAClub({ datasetReviewId, clubId: club.id })
})

export const AddDatasetReviewToClub = Command.make('add-dataset-review-to-club', { datasetReviewId, clubSlug }, program)
