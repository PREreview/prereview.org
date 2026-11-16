import { Array, Effect } from 'effect'
import type { Result as PublishedPreprintReview } from './Query.ts'
import { Prereview, PrereviewIsUnavailable } from './Types.ts'
import { Preprints } from '../../Preprints/index.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import { Clubs } from '../../Clubs/index.ts'

export const Enrich = Effect.fn('PreprintReviews.getPublishedPreprintReview.Enrich')(function* (
  publishedPreprintReview: PublishedPreprintReview,
) {
  const preprints = yield* Preprints
  const prereviewers = yield* Prereviewers
  const clubs = yield* Clubs

  const { preprint, namedAuthors, club } = yield* Effect.all(
    {
      preprint: preprints.getPreprint(publishedPreprintReview.preprintId),
      namedAuthors: Effect.forEach(
        publishedPreprintReview.authors.named,
        Effect.fnUntraced(function* (author) {
          if (author.persona === 'pseudonym') {
            return { name: author.pseudonym }
          }

          const publicPersona = yield* prereviewers.getPublicPersona(author.orcidId)

          return { name: publicPersona.displayName, orcid: author.orcidId }
        }),
        { concurrency: 'unbounded' },
      ),
      club: publishedPreprintReview.clubId
        ? clubs.getClubName(publishedPreprintReview.clubId)
        : Effect.succeed(undefined),
    },
    { concurrency: 'unbounded' },
  )

  if (!Array.isArrayNonEmpty(namedAuthors)) {
    return yield* new PrereviewIsUnavailable({ cause: 'no named authors' })
  }

  return new Prereview({
    ...publishedPreprintReview,
    preprint: { id: preprint.id, url: preprint.url, title: preprint.title.text, language: preprint.title.language },
    authors: { named: namedAuthors, anonymous: publishedPreprintReview.authors.anonymous },
    club,
  })
})
