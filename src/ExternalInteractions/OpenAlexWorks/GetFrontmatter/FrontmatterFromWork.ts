import { Array, flow, Number, Option, Record, Struct } from 'effect'
import { encode } from 'html-entities'
import type { OpenAlex } from '../../../ExternalApis/index.ts'
import { sanitizeHtml } from '../../../html.ts'
import type { Doi } from '../../../types/Doi.ts'
import type { Frontmatter } from './index.ts'

const TextFromInvertedIndex: (invertedIndex: Record.ReadonlyRecord<string, ReadonlyArray<number>>) => string = flow(
  Record.toEntries,
  Array.flatMap(([word, positions]) => Array.map(positions, position => ({ position, word }))),
  Array.sortWith(Struct.get('position'), Number.Order),
  Array.map(Struct.get('word')),
  Array.join(' '),
)

export const FrontmatterFromWork = (doi: Doi, work: OpenAlex.Work): Frontmatter => ({
  doi,
  title: sanitizeHtml(work.title, { allowBlockLevel: false }),
  abstract: work.abstract_inverted_index.pipe(
    Option.filter(invertedIndex => !Record.isEmptyReadonlyRecord(invertedIndex)),
    Option.map(invertedIndex => sanitizeHtml(`<p>${encode(TextFromInvertedIndex(invertedIndex))}</p>`)),
  ),
  authors: Array.map(work.authorships, ({ author, raw_author_name }) => ({
    displayName: Option.getOrElse(author.display_name, () => raw_author_name),
    orcidId: author.orcid,
  })),
})
