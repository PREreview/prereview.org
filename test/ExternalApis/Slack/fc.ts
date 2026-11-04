import type { Slack } from '../../../src/ExternalApis/index.ts'
import type { ChatDeleteInput } from '../../../src/ExternalApis/Slack/ChatDelete/ChatDeleteInput.ts'
import type { ChatPostMessageInput } from '../../../src/ExternalApis/Slack/ChatPostMessage/ChatPostMessageInput.ts'
import { ChannelId, Timestamp, UserId } from '../../../src/ExternalApis/Slack/Types.ts'
import type { UsersProfileSetInput } from '../../../src/ExternalApis/Slack/UsersProfileSet/UsersProfileSetInput.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const slackApi = (): fc.Arbitrary<typeof Slack.SlackApi.Service> =>
  fc.record({ apiToken: fc.redacted(fc.string()) })

const channelId = (): fc.Arbitrary<ChannelId> => fc.string().map(value => ChannelId.make(value))

const userId = (): fc.Arbitrary<UserId> => fc.string().map(value => UserId.make(value))

const timestamp = (): fc.Arbitrary<Timestamp> => fc.string().map(value => Timestamp.make(value))

const text = () =>
  fc.record(
    {
      type: fc.constant('text' as const),
      text: fc.string({ minLength: 1 }),
      style: fc.record({ bold: fc.boolean() }, { requiredKeys: [] }),
    },
    { requiredKeys: ['type', 'text'] },
  )

const link = () => fc.record({ type: fc.constant('link' as const), url: fc.url() })

const richTextBlock = () =>
  fc.record({
    type: fc.constant('rich_text' as const),
    elements: fc.nonEmptyArray(
      fc.record({
        type: fc.constantFrom('rich_text_quote' as const, 'rich_text_section' as const),
        elements: fc.nonEmptyArray(fc.oneof(text(), link())),
      }),
    ),
  })

const actionsBlock = () =>
  fc.record({
    type: fc.constant('actions' as const),
    elements: fc.nonEmptyArray(
      fc.record(
        {
          type: fc.constant('button' as const),
          text: fc.record({ type: fc.constant('plain_text' as const), text: fc.string({ minLength: 1 }) }),
          style: fc.constantFrom('primary' as const, 'danger' as const),
          url: fc.url(),
        },
        { requiredKeys: ['type', 'text', 'url'] },
      ),
    ),
  })

const markdownBlock = () => fc.record({ type: fc.constant('markdown' as const), text: fc.string({ minLength: 1 }) })

export const chatDeleteInput = (): fc.Arbitrary<ChatDeleteInput> => fc.record({ channel: channelId(), ts: timestamp() })

export const chatPostMessageInput = (): fc.Arbitrary<ChatPostMessageInput> =>
  fc.record(
    {
      channel: fc.oneof(channelId(), userId()),
      threadTs: timestamp(),
      blocks: fc.nonEmptyArray(fc.oneof(actionsBlock(), markdownBlock(), richTextBlock())),
      unfurlLinks: fc.boolean(),
      unfurlMedia: fc.boolean(),
    },
    { requiredKeys: ['channel', 'blocks'] },
  )

export const usersProfileSetInput = (): fc.Arbitrary<UsersProfileSetInput> =>
  fc.record({
    profile: fc.record({
      fields: fc.dictionary(fc.string(), fc.record({ value: fc.string(), alt: fc.string() })),
    }),
  })
