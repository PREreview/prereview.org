import { Effect, UndefinedOr } from 'effect'
import type * as Queries from '../../../Queries.ts'
import type { PublishedPreprintReviewDetails } from './Query.ts'
import { PublishedPreprintReview } from './Types.ts'
import type { WasAReviewRequested } from './WasAReviewRequested.ts'
import { Preprints } from '../../Preprints/index.ts'
import { Prereviewers, type UnableToGetPersona } from '../../Prereviewers/index.ts'
import { Clubs } from '../../Clubs/index.ts'

export const Enrich = (wasAReviewRequested: Queries.FromStatefulQuery<typeof WasAReviewRequested>) =>
  Effect.fn('PreprintReviews.getPublishedPreprintReview.Enrich')(function* (
    publishedPreprintReview: PublishedPreprintReviewDetails,
  ) {
    const preprints = yield* Preprints

    const { preprint, namedAuthors, club, requested } = yield* Effect.all(
      {
        preprint: preprints.getPreprint(publishedPreprintReview.preprintId),
        namedAuthors: getNamedAuthors(publishedPreprintReview.authors.named),
        club: getClubName(publishedPreprintReview.clubId),
        requested: wasAReviewRequested({
          preprintId: publishedPreprintReview.preprintId,
          published: publishedPreprintReview.published,
        }),
      },
      { concurrency: 'unbounded' },
    )

    return new PublishedPreprintReview({
      ...publishedPreprintReview,
      preprint: { id: preprint.id, url: preprint.url, title: preprint.title.text, language: preprint.title.language },
      authors: { named: namedAuthors, anonymous: publishedPreprintReview.authors.anonymous },
      club,
      requested,
    })
  })

const getNamedAuthors: (
  authors: PublishedPreprintReviewDetails['authors']['named'],
) => Effect.Effect<PublishedPreprintReview['authors']['named'], UnableToGetPersona, Prereviewers> = Effect.forEach(
  Prereviewers.getPersona,
  { concurrency: 'unbounded' },
)

const getClubName = UndefinedOr.match({
  onUndefined: () => Effect.undefined,
  onDefined: Clubs.getClubName,
})
