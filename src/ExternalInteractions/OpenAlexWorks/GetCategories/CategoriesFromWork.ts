import { Array, Equivalence, flow, String, Struct } from 'effect'
import type { OpenAlex } from '../../../ExternalApis/index.ts'

const UrlEquivalence: Equivalence.Equivalence<URL> = Equivalence.mapInput(String.Equivalence, url => url.href)

export const CategoriesFromWork: (work: OpenAlex.Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  Struct.get('topics'),
  Array.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  Array.dedupeWith(Equivalence.mapInput(UrlEquivalence, Struct.get('id'))),
)
