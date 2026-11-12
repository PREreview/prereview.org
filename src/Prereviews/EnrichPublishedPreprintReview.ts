import { Array, Effect } from 'effect'
import type { Result as PublishedPreprintReview } from './GetPublishedPreprintReview.ts'
import { Prereview, PrereviewIsUnavailable } from './Prereview.ts'
import { Preprints } from '../Preprints/index.ts'
import { Prereviewers } from '../Prereviewers/index.ts'

export const EnrichPublishedPreprintReview = Effect.fn('Prereviews.enrichPublishedPreprintReview')(function* (
  publishedPreprintReview: PublishedPreprintReview,
) {
  const preprints = yield* Preprints
  const prereviewers = yield* Prereviewers

  const preprint = yield* preprints.getPreprint(publishedPreprintReview.preprintId)

  const namedAuthors = yield* Effect.forEach(
    publishedPreprintReview.authors.named,
    Effect.fnUntraced(function* (author) {
      if (author.persona === 'pseudonym') {
        return { name: author.pseudonym }
      }

      const publicPersona = yield* prereviewers.getPublicPersona(author.orcidId)

      return { name: publicPersona.displayName, orcid: author.orcidId }
    }),
  )

  if (!Array.isArrayNonEmpty(namedAuthors)) {
    return yield* new PrereviewIsUnavailable({ cause: 'no named authors' })
  }

  return new Prereview({
    ...publishedPreprintReview,
    preprint: { id: preprint.id, url: preprint.url, title: preprint.title.text, language: preprint.title.language },
    authors: { named: namedAuthors, anonymous: publishedPreprintReview.authors.anonymous },
  })
})
