import { Schema } from 'effect'
import { ChannelId, Timestamp } from '../Types.ts'

export type ChatDeleteInput = Schema.Schema.Type<typeof ChatDeleteInput>

export const ChatDeleteInput = Schema.Struct({
  channel: ChannelId,
  ts: Timestamp,
})
