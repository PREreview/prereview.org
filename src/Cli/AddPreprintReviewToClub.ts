import { Array, Console, Effect, Option, pipe, Schema } from 'effect'
import { Command, Prompt } from 'effect/cli'
import { Clubs } from '../Domain/Clubs/index.ts'
import { PreprintReviews, type Prereview } from '../Domain/PreprintReviews/index.ts'
import { plainText } from '../html.ts'
import * as Doi from '../types/Doi.ts'

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

const PreprintReviewIdOrDoiSchema = Schema.Trim.pipe(
  Schema.decodeTo(
    Schema.Union([
      Schema.FiniteFromString.check(Schema.isInt(), Schema.isGreaterThan(0)),
      Doi.DoiSchema,
      Doi.DoiFromUrlSchema,
    ]),
  ),
)

const program = Effect.fnUntraced(function* () {
  const preprintReviews = yield* PreprintReviews

  const preprintReviewIds: Array<number> = []

  const findPreprintReviewId = (input: string) => {
    const idOrDoi = Schema.decodeOption(PreprintReviewIdOrDoiSchema)(input)

    if (Option.isNone(idOrDoi)) {
      return Effect.as(Console.log('Not an ID or DOI'), Option.none())
    }

    if (typeof idOrDoi.value === 'number') {
      return Effect.succeedSome(idOrDoi.value)
    }

    return pipe(
      preprintReviews.getPreprintReviewIdForADoi(idOrDoi.value),
      Effect.map(Option.some),
      Effect.catchTag('PrereviewIsNotFound', () => Effect.as(Console.log('Not found'), Option.none())),
    )
  }

  yield* Effect.gen(function* () {
    const input = yield* Prompt.String({ message: 'Which PREreview (ID or DOI)?' })

    const preprintReviewId = yield* findPreprintReviewId(input)

    if (Option.isNone(preprintReviewId)) {
      return
    }

    if (Array.contains(preprintReviewIds, preprintReviewId.value)) {
      return yield* Console.log('Already selected')
    }

    yield* pipe(
      preprintReviews.getPreprintReview(preprintReviewId.value),
      Effect.tap(prereview => Console.log(`\n${describePrereview(prereview)}\n`)),
      Effect.tap(() => Effect.sync(() => preprintReviewIds.push(preprintReviewId.value))),
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
