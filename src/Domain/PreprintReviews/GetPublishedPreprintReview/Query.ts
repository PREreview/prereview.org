import { Array, Filter, Match, Option, Result, Struct } from 'effect'
import * as Events from '../../../Events.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import * as Queries from '../../../Queries.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import {
  PrereviewIsNotFound,
  PrereviewIsUnavailable,
  PrereviewWasRemoved,
  type PublishedPreprintReview,
} from './Types.ts'

export type Input = number

export type PublishedPreprintReviewDetails = Omit<
  PublishedPreprintReview,
  '_tag' | 'pipe' | 'club' | 'preprint' | 'authors' | 'requested'
> & {
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
  (events: ReadonlyArray<Events.Event>, input: Input): Result.Result<PublishedPreprintReviewDetails, Error> =>
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

      const content = Match.valueTags(imported.content, {
        Full: ({ text }) => ({ _tag: 'Full' as const, text }),
        Structured: content => ({ _tag: 'Structured' as const, questions: Struct.omit(content, ['_tag']) }),
      })

      const namedAuthors = Array.appendAll(
        Array.filterMap(imported.authors, Filter.fromPredicateOption(toNamedAuthor)),
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
        competingInterests: imported.competingInterests,
        doi: imported.doi,
        id: imported.id,
        language: imported.language,
        license: imported.license,
        live: imported.live,
        preprintId: imported.preprint,
        published: imported.published,
        content,
        useOfAi: imported.useOfAi,
      }
    })

const toNamedAuthor = Match.typeTags<
  Events.PreprintReviewImported['authors'][number],
  Option.Option<PublishedPreprintReviewDetails['authors']['named'][number]>
>()({
  PublicPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'public' }),
  PseudonymPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'pseudonym' }),
  Unknown: () => Option.none(),
})

export const Query = (removedPreprintReviewIds: ReadonlyArray<number>) =>
  Queries.OnDemandQuery({
    name: 'PreprintReviews.getPublishedPreprintReview.Query',
    createFilter,
    query: query(removedPreprintReviewIds),
  })
