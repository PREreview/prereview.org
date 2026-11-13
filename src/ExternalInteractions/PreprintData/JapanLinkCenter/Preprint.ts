import { Array, Result, Option, pipe } from 'effect'
import type { JapanLinkCenter } from '../../../ExternalApis/index.ts'
import { html } from '../../../html.ts'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import { Name } from '../../../types/Name.ts'
import { isDoiFromSupportedPublisher, type JapanLinkCenterPreprintId } from './PreprintId.ts'

const determineJapanLinkCenterPreprintId = (
  record: JapanLinkCenter.Record,
): Result.Result<JapanLinkCenterPreprintId, Preprints.PreprintIsUnavailable> =>
  Result.gen(function* () {
    const doi = record.doi

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Result.fail(new Preprints.PreprintIsUnavailable({ cause: doi }))
    }

    return new Preprints.JxivPreprintId({ value: doi })
  })

export const recordToPreprint = (
  record: JapanLinkCenter.Record,
): Result.Result<Preprints.Preprint, Preprints.NotAPreprint | Preprints.PreprintIsUnavailable> =>
  Result.gen(function* () {
    if (record.content_type !== 'GD') {
      yield* Result.fail(new Preprints.NotAPreprint({ cause: record.content_type }))
    }

    const id = yield* determineJapanLinkCenterPreprintId(record)

    const authors = Array.map(record.creator_list, creator => ({
      name: pipe(Array.headNonEmpty(creator.names), name =>
        typeof name.last_name === 'string' ? Name(`${name.first_name} ${name.last_name}`) : Name(name.first_name),
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

    return Preprints.Preprint({
      authors,
      id,
      posted: record.publication_date,
      title,
      url: record.url,
    })
  })
