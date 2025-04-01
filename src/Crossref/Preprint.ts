import { Array, Either } from 'effect'
import { html } from '../html.js'
import * as Preprint from '../preprint.js'
import { type CrossrefPreprintId, isCrossrefPreprintDoi } from './PreprintId.js'
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

    const id = { type: 'ssrn', value: doi } satisfies CrossrefPreprintId

    const authors = Array.map(work.author, author => ({ name: `${author.given} ${author.family}` }))

    const title = {
      language: 'en' as const,
      text: html`${work.title[0]}`,
    }

    return Preprint.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      url: work.resource.primary.URL,
    })
  })
