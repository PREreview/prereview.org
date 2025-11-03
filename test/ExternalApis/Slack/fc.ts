import { Arbitrary } from 'effect'
import type { Slack } from '../../../src/ExternalApis/index.ts'
import { ChatPostMessageInput } from '../../../src/ExternalApis/Slack/ChatPostMessage/ChatPostMessageInput.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const slackApi = (): fc.Arbitrary<typeof Slack.SlackApi.Service> =>
  fc.record({
    apiToken: fc.redacted(fc.string()),
    apiUpdate: fc.boolean(),
  })

export const chatPostMessageInput = (): fc.Arbitrary<ChatPostMessageInput> => Arbitrary.make(ChatPostMessageInput)
