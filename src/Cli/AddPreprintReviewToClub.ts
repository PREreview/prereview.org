import { Effect, pipe } from 'effect'
import { Argument, Command } from 'effect/cli'
import { Clubs } from '../Domain/Clubs/index.ts'
import { PreprintReviews } from '../Domain/PreprintReviews/index.ts'
import { type Slug, SlugSchema } from '../types/Slug.ts'

const preprintReviewId = Argument.Int('preprintReviewId')

const clubSlug = pipe(Argument.String('clubSlug'), Argument.withSchema(SlugSchema))

const program = Effect.fnUntraced(function* ({
  preprintReviewId,
  clubSlug,
}: {
  preprintReviewId: number
  clubSlug: Slug
}) {
  const clubs = yield* Clubs
  const preprintReviews = yield* PreprintReviews

  const club = yield* clubs.getClubBySlug(clubSlug)

  yield* preprintReviews.addPublishedReviewToAClub({ preprintReviewId, clubId: club.id })
})

export const AddPreprintReviewToClub = Command.make(
  'add-preprint-review-to-club',
  { preprintReviewId, clubSlug },
  program,
)
