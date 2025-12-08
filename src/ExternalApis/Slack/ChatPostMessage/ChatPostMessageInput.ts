import { Schema } from 'effect'
import { ChannelId, Timestamp, UserId } from '../Types.ts'

export type ChatPostMessageInput = Schema.Schema.Type<typeof ChatPostMessageInput>

const Text = Schema.Struct({
  type: Schema.tag('text'),
  text: Schema.NonEmptyString,
  style: Schema.optional(
    Schema.Struct({
      bold: Schema.optional(Schema.Boolean),
    }),
  ),
})

const Link = Schema.Struct({
  type: Schema.tag('link'),
  url: Schema.URL,
})

const RichTextSection = Schema.Struct({
  type: Schema.tag('rich_text_section'),
  elements: Schema.NonEmptyArray(Schema.Union(Text, Link)),
})

const RichTextBlock = Schema.Struct({
  type: Schema.tag('rich_text'),
  elements: Schema.Tuple(RichTextSection),
})

export const ChatPostMessageInput = Schema.Struct({
  channel: Schema.Union(ChannelId, UserId),
  threadTs: Schema.optional(Timestamp).pipe(Schema.fromKey('thread_ts')),
  blocks: Schema.Tuple(RichTextBlock),
  unfurlLinks: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_media')),
})
