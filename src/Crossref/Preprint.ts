import { Array, Either } from 'effect'
import { html } from '../html.js'
import * as Preprint from '../preprint.js'
import { fromCrossrefPreprintDoi, isCrossrefPreprintDoi } from './PreprintId.js'
import type { Work } from './Work.js'

export const workToPreprint = (
  work: Work,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (work.type !== 'posted-content' || work.subtype !== 'preprint') {
      yield* Either.left(new Preprint.NotAPreprint({ cause: { type: work.type, subtype: work.subtype } }))
    }

    const doi = work.DOI

    if (!isCrossrefPreprintDoi(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    const id = fromCrossrefPreprintDoi(doi)

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
          text: html`${title[0]}`,
        }),
    })

    return Preprint.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      url: work.resource.primary.URL,
    })
  })
