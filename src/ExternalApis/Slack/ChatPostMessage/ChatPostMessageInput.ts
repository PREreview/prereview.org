import { Schema } from 'effect'
import { ChannelId } from '../Types.ts'

export type ChatPostMessageInput = Schema.Schema.Type<typeof ChatPostMessageInput>

export const ChatPostMessageInput = Schema.Struct({
  channel: ChannelId,
  text: Schema.NonEmptyString,
  unfurlLinks: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_media')),
})
