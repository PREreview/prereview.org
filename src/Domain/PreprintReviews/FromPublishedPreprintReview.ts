import { Array, Match, Result } from 'effect'
import { matchPersona } from '../Prereviewers/index.ts'
import { PrereviewIsUnavailable, type PublishedPreprintReview } from './GetPublishedPreprintReview/index.ts'
import { Prereview } from './Prereview.ts'

export const fromPublishedPreprintReview = (
  review: PublishedPreprintReview,
): Result.Result<Prereview, PrereviewIsUnavailable> =>
  Match.valueTags(review.content, {
    Full: ({ text }) =>
      Result.succeed(
        new Prereview({
          addendum: review.addendum,
          authors: {
            named: Array.map(
              review.authors.named,
              matchPersona({
                onPublic: persona => ({ name: persona.displayName, orcid: persona.orcidId }),
                onPseudonym: persona => ({ name: persona.pseudonym }),
              }),
            ),
            anonymous: review.authors.anonymous,
          },
          club: review.club,
          doi: review.doi,
          id: review.id,
          language: review.language,
          license: review.license,
          published: review.published,
          preprint: review.preprint,
          live: review.live,
          requested: review.requested,
          structured: false,
          text,
        }),
      ),
    Structured: () => Result.fail(new PrereviewIsUnavailable({ cause: 'structured review not implemented' })),
  })
