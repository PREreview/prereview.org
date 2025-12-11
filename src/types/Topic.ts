import { ParseResult, pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import topics from './data/topics.json' with { type: 'json' }

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

export function isTopicId(value: string): value is TopicId {
  return (topicIds as ReadonlyArray<string>).includes(value)
}
