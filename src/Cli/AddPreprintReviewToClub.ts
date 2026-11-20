import { Array, Console, Effect } from 'effect'
import { Command, Prompt } from 'effect/cli'
import { Clubs } from '../Domain/Clubs/index.ts'
import { PreprintReviews, type Prereview } from '../Domain/PreprintReviews/index.ts'
import { plainText } from '../html.ts'

const describePrereview = (prereview: Prereview): string => {
  const authors = Array.map(prereview.authors.named, author => author.name)
  const anonymous = prereview.authors.anonymous > 0 ? [`${prereview.authors.anonymous} anonymous`] : []

  return [
    `Preprint:  ${plainText(prereview.preprint.title).toString()}`,
    `Authors:   ${[...authors, ...anonymous].join(', ')}`,
    `Published: ${prereview.published.toString()}`,
    `DOI:       ${prereview.doi}`,
    `Club:      ${prereview.club?.name ?? 'none'}`,
  ].join('\n')
}

const program = Effect.fnUntraced(function* () {
  const preprintReviews = yield* PreprintReviews

  const preprintReviewId = yield* Prompt.Int({ message: 'Which PREreview (ID)?', min: 1 })

  const prereview = yield* preprintReviews.getPreprintReview(preprintReviewId)

  yield* Console.log(describePrereview(prereview))

  const clubs = yield* Clubs.listClubs

  const club = yield* Prompt.AutoComplete({
    message: 'Which club?',
    choices: Array.map(clubs, club => ({
      title: club.name,
      value: club,
      description: club.status === 'inactive' ? `${club.slug} (inactive)` : club.slug,
    })),
  })

  const confirmed = yield* Prompt.Confirm({ message: `Add this PREreview to ${club.name}?` })

  if (!confirmed) {
    return
  }

  yield* preprintReviews.addPublishedReviewToAClub({ preprintReviewId, clubId: club.id })
})

export const AddPreprintReviewToClub = Command.make('add-preprint-review-to-club', {}, program)
