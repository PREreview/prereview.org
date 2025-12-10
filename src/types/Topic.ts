import { pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import topics from './data/topics.json' with { type: 'json' }

export type TopicId = keyof typeof topics

export const topicIds = Object.keys(topics) as Array<TopicId>

export const TopicIdSchema = pipe(Schema.String, Schema.filter(isTopicId))

export function isTopicId(value: string): value is TopicId {
  return (topicIds as ReadonlyArray<string>).includes(value)
}
