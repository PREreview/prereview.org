import { Schema } from 'effect'
import { ChannelId, Timestamp, UserId } from '../Types.ts'

export type ChatPostMessageInput = Schema.Schema.Type<typeof ChatPostMessageInput>

const PlainText = Schema.Struct({
  type: Schema.tag('plain_text'),
  text: Schema.NonEmptyString,
})

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

const RichTextQuote = Schema.Struct({
  type: Schema.tag('rich_text_quote'),
  elements: Schema.NonEmptyArray(Schema.Union(Text, Link)),
})

const RichTextSection = Schema.Struct({
  type: Schema.tag('rich_text_section'),
  elements: Schema.NonEmptyArray(Schema.Union(Text, Link)),
})

const RichTextBlock = Schema.Struct({
  type: Schema.tag('rich_text'),
  elements: Schema.NonEmptyArray(Schema.Union(RichTextQuote, RichTextSection)),
})

const ButtonElement = Schema.Struct({
  type: Schema.tag('button'),
  text: PlainText,
  style: Schema.optional(Schema.Literal('primary', 'danger')),
  url: Schema.URL,
})

const ActionsBlock = Schema.Struct({
  type: Schema.tag('actions'),
  elements: Schema.NonEmptyArray(ButtonElement),
})

const MarkdownBlock = Schema.Struct({
  type: Schema.tag('markdown'),
  text: Schema.NonEmptyString,
})

export const ChatPostMessageInput = Schema.Struct({
  channel: Schema.Union(ChannelId, UserId),
  threadTs: Schema.optional(Timestamp).pipe(Schema.fromKey('thread_ts')),
  blocks: Schema.NonEmptyArray(Schema.Union(ActionsBlock, MarkdownBlock, RichTextBlock)),
  unfurlLinks: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_links')),
  unfurlMedia: Schema.optional(Schema.Boolean).pipe(Schema.fromKey('unfurl_media')),
})
