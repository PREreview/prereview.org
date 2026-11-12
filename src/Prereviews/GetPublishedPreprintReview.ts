import { Array, Match, Option, Result } from 'effect'
import * as Events from '../Events.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import * as Queries from '../Queries.ts'
import { Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import { type Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from './Prereview.ts'

export type Input = number

export type Result = Omit<Prereview, '_tag' | 'pipe' | 'club' | 'preprint' | 'authors'> & {
  clubId?: Uuid
  preprintId: IndeterminatePreprintId
  authors: {
    named: ReadonlyArray<{ orcidId: OrcidId; persona: 'public' | 'pseudonym' }>
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
  (events: ReadonlyArray<Events.Event>, input: Input): Result.Result<Result, Error> =>
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
        Structured: () => Result.fail(new PrereviewIsUnavailable()),
      })

      return {
        ...(imported.addendum !== undefined ? { addendum: imported.addendum } : {}),
        authors: {
          named: Array.appendAll(
            Array.flatMap(imported.authors, toNamedAuthors),
            Array.map(authorChoices, ({ orcidId, persona }) => ({ orcidId, persona })),
          ),
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
): ReadonlyArray<Result['authors']['named'][number]> => {
  if (author._tag === 'Unknown') {
    return []
  }

  return [{ orcidId: author.orcidId, persona: author._tag === 'PublicPersona' ? 'public' : 'pseudonym' }]
}

export const GetPublishedPreprintReview = (removedPreprintReviewIds: ReadonlyArray<number>) =>
  Queries.OnDemandQuery({
    name: 'Prereviews.getPublishedPreprintReview',
    createFilter,
    query: query(removedPreprintReviewIds),
  })
