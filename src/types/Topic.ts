import { pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import topics from './data/topics.json' with { type: 'json' }
import type { DomainId } from './domain.ts'
import type { FieldId } from './field.ts'
import type { SubfieldId } from './subfield.ts'

export type TopicId = keyof typeof topics

export const topicIds = Object.keys(topics) as Array<TopicId>

export const TopicIdSchema = pipe(Schema.String, Schema.refine(isTopicId))

export const TopicIdFromOpenAlexUrlSchema = Schema.URL.pipe(
  Schema.decodeTo(TopicIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/T')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(2)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(topicId =>
      Effect.succeed(new URL(`https://openalex.org/T${encodeURIComponent(topicId)}`)),
    ),
  }),
)

export const getTopicDomain = (id: TopicId) => topics[id].domain as DomainId

export const getTopicField = (id: TopicId) => topics[id].field as FieldId

export const getTopicSubfield = (id: TopicId) => topics[id].subfield as SubfieldId

export function isTopicId(value: string): value is TopicId {
  return (topicIds as ReadonlyArray<string>).includes(value)
}
