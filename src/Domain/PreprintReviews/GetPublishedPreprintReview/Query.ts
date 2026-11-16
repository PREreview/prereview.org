import { Array, Match, Option, Result, Struct } from 'effect'
import * as Events from '../../../Events.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import * as Queries from '../../../Queries.ts'
import { Temporal } from '../../../types/index.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { type Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from './Types.ts'

export type Input = number

export type PublishedPreprintReview = Omit<Prereview, '_tag' | 'pipe' | 'club' | 'preprint' | 'authors'> & {
  clubId?: Uuid
  preprintId: IndeterminatePreprintId
  authors: {
    named: Array.NonEmptyReadonlyArray<{ orcidId: OrcidId; persona: 'public' | 'pseudonym' }>
    anonymous: number
  }
}

export type Error = PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved

const createFilter = (id: Input) =>
  Events.EventFilter([
    { types: ['PreprintReviewImported'], predicates: { id } },
    { types: ['AuthorChoicesForAReviewImported'], predicates: { reviewId: id } },
  ])

const query =
  (removedPreprintReviewIds: ReadonlyArray<number>) =>
  (events: ReadonlyArray<Events.Event>, input: Input): Result.Result<PublishedPreprintReview, Error> =>
    Result.gen(function* () {
      if (Array.contains(removedPreprintReviewIds, input)) {
        return yield* Result.fail(new PrereviewWasRemoved())
      }

      const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

      const { imported, authorChoices } = yield* Result.fromOption(
        Array.reduce(
          filteredEvents,
          Option.none<{
            imported: Events.PreprintReviewImported
            authorChoices: ReadonlyArray<Events.AuthorChoicesForAReviewImported>
          }>(),
          (state, event) =>
            Match.valueTags(event, {
              PreprintReviewImported: imported => Option.some({ imported, authorChoices: [] }),
              AuthorChoicesForAReviewImported: authorChoice =>
                Option.map(state, state => ({
                  ...state,
                  authorChoices: Array.append(state.authorChoices, authorChoice),
                })),
            }),
        ),
        () => new PrereviewIsNotFound(),
      )

      const text = yield* Match.valueTags(imported.content, {
        FreeText: ({ text }) => Result.succeed(text),
        Structured: () => Result.fail(new PrereviewIsUnavailable({ cause: 'structured review not implemented' })),
      })

      const namedAuthors = Array.appendAll(
        Array.flatMap(imported.authors, toNamedAuthors),
        Array.map(authorChoices, Struct.pick(['orcidId', 'persona'])),
      )

      if (!Array.isReadonlyArrayNonEmpty(namedAuthors)) {
        return yield* Result.fail(new PrereviewIsUnavailable({ cause: 'no named authors' }))
      }

      return {
        ...(imported.addendum !== undefined ? { addendum: imported.addendum } : {}),
        authors: {
          named: namedAuthors,
          anonymous:
            imported.otherAuthors +
            Array.length(Array.filter(imported.authors, author => author._tag === 'Unknown')) -
            Array.length(authorChoices),
        },
        ...(imported.club !== undefined ? { clubId: imported.club } : {}),
        doi: imported.doi,
        id: imported.id,
        language: imported.language,
        license: imported.license,
        live: imported.live,
        preprintId: imported.preprint,
        published:
          imported.published instanceof Temporal.Instant
            ? imported.published.toZonedDateTimeISO('UTC').toPlainDate()
            : imported.published,
        requested: false,
        structured: false,
        text,
      }
    })

const toNamedAuthors = (
  author: Events.PreprintReviewImported['authors'][number],
): ReadonlyArray<PublishedPreprintReview['authors']['named'][number]> => {
  if (author._tag === 'Unknown') {
    return []
  }

  if (author._tag === 'PseudonymPersona') {
    return [{ orcidId: author.orcidId, persona: 'pseudonym' }]
  }

  return [{ orcidId: author.orcidId, persona: 'public' }]
}

export const Query = (removedPreprintReviewIds: ReadonlyArray<number>) =>
  Queries.OnDemandQuery({
    name: 'PreprintReviews.getPublishedPreprintReview.Query',
    createFilter,
    query: query(removedPreprintReviewIds),
  })
