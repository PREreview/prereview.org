import { Arbitrary } from 'effect'
import type { Slack } from '../../../src/ExternalApis/index.ts'
import { ChatDeleteInput } from '../../../src/ExternalApis/Slack/ChatDelete/ChatDeleteInput.ts'
import { ChatPostMessageInput } from '../../../src/ExternalApis/Slack/ChatPostMessage/ChatPostMessageInput.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const slackApi = (): fc.Arbitrary<typeof Slack.SlackApi.Service> =>
  fc.record({ apiToken: fc.redacted(fc.string()) })

export const chatDeleteInput = (): fc.Arbitrary<ChatDeleteInput> => Arbitrary.make(ChatDeleteInput)

export const chatPostMessageInput = (): fc.Arbitrary<ChatPostMessageInput> => Arbitrary.make(ChatPostMessageInput)
