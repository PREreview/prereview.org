import { Array, Effect } from 'effect'
import { Argument, Command, Prompt } from 'effect/cli'
import { Clubs } from '../Domain/Clubs/index.ts'
import { PreprintReviews } from '../Domain/PreprintReviews/index.ts'

const preprintReviewId = Argument.Int('preprintReviewId')

const program = Effect.fnUntraced(function* ({ preprintReviewId }: { preprintReviewId: number }) {
  const preprintReviews = yield* PreprintReviews
  const clubs = yield* Clubs.listClubs

  const clubId = yield* Prompt.AutoComplete({
    message: 'Which club?',
    choices: Array.map(clubs, club => ({
      title: club.name,
      value: club.id,
      description: club.status === 'inactive' ? `${club.slug} (inactive)` : club.slug,
    })),
  })

  yield* preprintReviews.addPublishedReviewToAClub({ preprintReviewId, clubId })
})

export const AddPreprintReviewToClub = Command.make('add-preprint-review-to-club', { preprintReviewId }, program)
