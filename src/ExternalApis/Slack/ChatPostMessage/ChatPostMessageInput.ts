import { Schema } from 'effect'
import { ChannelId } from '../Types.ts'

export type ChatPostMessageInput = Schema.Schema.Type<typeof ChatPostMessageInput>

const Text = Schema.Struct({
  type: Schema.tag('text'),
  text: Schema.NonEmptyString,
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
  channel: ChannelId,
  blocks: Schema.Tuple(RichTextBlock),
  unfurlLinks: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_media')),
})
