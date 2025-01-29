import { Array, Either, Option, pipe } from 'effect'
import { html } from '../html.js'
import * as Preprint from '../preprint.js'
import { isJapanLinkCenterPreprintDoi, type JapanLinkCenterPreprintId } from './PreprintId.js'
import type { Record } from './Record.js'

export const recordToPreprint = (
  record: Record,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (record.content_type !== 'GD') {
      yield* Either.left(new Preprint.NotAPreprint({ cause: record.content_type }))
    }

    const doi = record.doi

    if (!isJapanLinkCenterPreprintDoi(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    const id = { type: 'jxiv', value: doi } satisfies JapanLinkCenterPreprintId

    const authors = Array.map(record.creator_list, creator => ({
      name: pipe(Array.headNonEmpty(creator.names), name =>
        typeof name.last_name === 'string' ? `${name.first_name} ${name.last_name}` : name.first_name,
      ),
      orcid: Option.match(Array.head(creator.researcher_id_list), {
        onSome: id => id.id_code,
        onNone: () => undefined,
      }),
    }))

    const title = pipe(Array.headNonEmpty(record.title_list), title => ({
      language: title.lang,
      text: typeof title.subtitle === 'string' ? html`${title.title}: ${title.subtitle}` : html`${title.title}`,
    }))

    return Preprint.Preprint({
      authors,
      id,
      posted: record.publication_date,
      title,
      url: record.url,
    })
  })
