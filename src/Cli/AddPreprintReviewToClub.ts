import { Array, Console, Effect, pipe } from 'effect'
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

  const preprintReviewIds: Array<number> = []

  yield* Effect.gen(function* () {
    const preprintReviewId = yield* Prompt.Int({ message: 'Which PREreview (ID)?', min: 1 })

    if (Array.contains(preprintReviewIds, preprintReviewId)) {
      return yield* Console.log('Already selected')
    }

    yield* pipe(
      preprintReviews.getPreprintReview(preprintReviewId),
      Effect.tap(prereview => Console.log(describePrereview(prereview))),
      Effect.tap(() => Effect.sync(() => preprintReviewIds.push(preprintReviewId))),
      Effect.catchTags({
        PrereviewIsNotFound: () => Console.log('Not found'),
        PrereviewWasRemoved: () => Console.log('Was removed'),
      }),
    )
  }).pipe(Effect.repeat({ while: () => Prompt.Confirm({ message: 'Add another PREreview?' }) }))

  if (!Array.isArrayNonEmpty(preprintReviewIds)) {
    return
  }

  const clubs = yield* Clubs.listClubs

  const club = yield* Prompt.AutoComplete({
    message: 'Which club?',
    choices: Array.map(clubs, club => ({
      title: club.name,
      value: club,
      description: club.status === 'inactive' ? `${club.slug} (inactive)` : club.slug,
    })),
  })

  const confirmed = yield* Prompt.Confirm({
    message: `Add ${preprintReviewIds.length === 1 ? 'this PREreview' : `these ${preprintReviewIds.length} PREreviews`} to ${club.name}?`,
  })

  if (!confirmed) {
    return
  }

  yield* Effect.forEach(
    preprintReviewIds,
    preprintReviewId => preprintReviews.addPublishedReviewToAClub({ preprintReviewId, clubId: club.id }),
    { discard: true },
  )
})

export const AddPreprintReviewToClub = Command.make('add-preprint-review-to-club', {}, program)
