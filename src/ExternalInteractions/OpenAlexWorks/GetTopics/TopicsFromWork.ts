import { Array, flow, Schema, Struct, type Option } from 'effect'
import type { OpenAlex } from '../../../ExternalApis/index.ts'
import { TopicIdFromOpenAlexUrlSchema, type TopicId } from '../../../types/Topic.ts'

export const TopicsFromWork: (work: OpenAlex.Work) => ReadonlyArray<Option.Option<TopicId>> = flow(
  Struct.get('topics'),
  Array.map(topic => Schema.decodeOption(TopicIdFromOpenAlexUrlSchema)(topic.id)),
)
