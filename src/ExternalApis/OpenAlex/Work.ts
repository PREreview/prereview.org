import { Array, Data, Equivalence, flow, Option, Schema, String, Struct } from 'effect'
import { Iso639 } from '../../types/index.ts'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  language: Schema.requiredToOptional(Schema.NullOr(Schema.String), Iso639.Iso6391Schema, {
    decode: Option.fromNullable,
    encode: Option.getOrNull,
  }),
  keywords: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
    }),
  ),
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
    }),
  ),
})

export class WorkIsNotFound extends Data.TaggedError('WorkIsNotFound')<{ cause?: unknown }> {}

export class WorkIsUnavailable extends Data.TaggedError('WorkIsUnavailable')<{ cause?: unknown }> {}

const UrlEquivalence: Equivalence.Equivalence<URL> = Equivalence.mapInput(String.Equivalence, url => url.href)

export const getCategories: (work: Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  Struct.get('topics'),
  Array.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  Array.dedupeWith(Equivalence.mapInput(UrlEquivalence, Struct.get('id'))),
)
