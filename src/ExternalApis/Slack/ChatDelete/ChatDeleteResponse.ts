import { Schema } from 'effect'
import { ChannelId, Timestamp } from '../Types.ts'

export type ChatDeleteResponse = Schema.Schema.Type<typeof ChatDeleteResponse>

export const ChatDeleteResponse = Schema.Struct({
  channel: ChannelId,
  ts: Timestamp,
})
