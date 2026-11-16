import { Array, Effect, UndefinedOr } from 'effect'
import type { Result as PublishedPreprintReview } from './Query.ts'
import { Prereview, PrereviewIsUnavailable } from './Types.ts'
import { Preprints } from '../../Preprints/index.ts'
import { Prereviewers, type UnableToGetPersona } from '../../Prereviewers/index.ts'
import { Clubs } from '../../Clubs/index.ts'

export const Enrich = Effect.fn('PreprintReviews.getPublishedPreprintReview.Enrich')(function* (
  publishedPreprintReview: PublishedPreprintReview,
) {
  const preprints = yield* Preprints

  const { preprint, namedAuthors, club } = yield* Effect.all(
    {
      preprint: preprints.getPreprint(publishedPreprintReview.preprintId),
      namedAuthors: getNamedAuthors(publishedPreprintReview.authors.named),
      club: getClubName(publishedPreprintReview.clubId),
    },
    { concurrency: 'unbounded' },
  )

  if (!Array.isReadonlyArrayNonEmpty(namedAuthors)) {
    return yield* new PrereviewIsUnavailable({ cause: 'no named authors' })
  }

  return new Prereview({
    ...publishedPreprintReview,
    preprint: { id: preprint.id, url: preprint.url, title: preprint.title.text, language: preprint.title.language },
    authors: { named: namedAuthors, anonymous: publishedPreprintReview.authors.anonymous },
    club,
  })
})

const getNamedAuthors: (
  authors: PublishedPreprintReview['authors']['named'],
) => Effect.Effect<ReadonlyArray<Prereview['authors']['named'][number]>, UnableToGetPersona, Prereviewers> =
  Effect.forEach(
    Effect.fnUntraced(function* (author) {
      if (author.persona === 'pseudonym') {
        return { name: author.pseudonym }
      }

      const publicPersona = yield* Prereviewers.getPublicPersona(author.orcidId)

      return { name: publicPersona.displayName, orcid: author.orcidId }
    }),
    { concurrency: 'unbounded' },
  )

const getClubName = UndefinedOr.match({
  onUndefined: () => Effect.undefined,
  onDefined: Clubs.getClubName,
})
