import { Schema } from 'effect'
import { Timestamp } from '../Types.ts'

export type ChatPostMessageResponse = Schema.Schema.Type<typeof ChatPostMessageResponse>

export const ChatPostMessageResponse = Schema.Struct({
  ts: Timestamp,
})
