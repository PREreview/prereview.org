import { Schema } from 'effect'
import { ChannelId, Timestamp } from '../Types.ts'

export type ChatPostMessageResponse = Schema.Schema.Type<typeof ChatPostMessageResponse>

export const ChatPostMessageResponse = Schema.Struct({
  channel: ChannelId,
  ts: Timestamp,
})
