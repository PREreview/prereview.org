import { Array, Either } from 'effect'
import { sanitizeHtml } from '../html.js'
import { transformJatsToHtml } from '../jats.js'
import * as Preprint from '../preprint.js'
import { type CrossrefPreprintId, fromCrossrefPreprintDoi, isDoiFromSupportedPublisher } from './PreprintId.js'
import type { Work } from './Work.js'

const determineCrossrefPreprintId = (work: Work): Either.Either<CrossrefPreprintId, Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = work.DOI

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    const indeterminateId = fromCrossrefPreprintDoi(doi)

    if (indeterminateId.type !== 'biorxiv-medrxiv') {
      return indeterminateId
    }

    const institutionName = work.institution?.[0].name

    if (institutionName === 'bioRxiv') {
      return {
        value: indeterminateId.value,
        type: 'biorxiv',
      }
    }

    if (institutionName === 'medRxiv') {
      return {
        value: indeterminateId.value,
        type: 'medrxiv',
      }
    }

    return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
  })

export const workToPreprint = (
  work: Work,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (work.type !== 'posted-content' || work.subtype !== 'preprint') {
      yield* Either.left(new Preprint.NotAPreprint({ cause: { type: work.type, subtype: work.subtype } }))
    }

    const id = yield* determineCrossrefPreprintId(work)

    const authors = yield* Array.match(work.author, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { author: work.author } })),
      onNonEmpty: authors =>
        Either.right(
          Array.map(authors, author => ({
            name: `${author.given} ${author.family}`,
            orcid: author.ORCID,
          })),
        ),
    })

    const title = yield* Array.match(work.title, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { title: work.title } })),
      onNonEmpty: title =>
        Either.right({
          language: 'en' as const,
          text: sanitizeHtml(title[0]),
        }),
    })

    const abstract =
      work.abstract !== undefined ? { language: 'en' as const, text: transformJatsToHtml(work.abstract) } : undefined

    return Preprint.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      abstract,
      url: work.resource.primary.URL,
    })
  })
