import { ParseResult, pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import topics from './data/topics.json' with { type: 'json' }
import type { DomainId } from './domain.ts'
import type { FieldId } from './field.ts'
import type { SubfieldId } from './subfield.ts'

export type TopicId = keyof typeof topics

export const topicIds = Object.keys(topics) as Array<TopicId>

export const TopicIdSchema = pipe(Schema.String, Schema.filter(isTopicId))

export const TopicIdFromOpenAlexUrlSchema = Schema.transformOrFail(Schema.URLFromSelf, TopicIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/T')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(2)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/T${encodeURIComponent(topicId)}`)),
})

export const getTopicDomain = (id: TopicId) => topics[id].domain as DomainId

export const getTopicField = (id: TopicId) => topics[id].field as FieldId

export const getTopicSubfield = (id: TopicId) => topics[id].subfield as SubfieldId

export function isTopicId(value: string): value is TopicId {
  return (topicIds as ReadonlyArray<string>).includes(value)
}
