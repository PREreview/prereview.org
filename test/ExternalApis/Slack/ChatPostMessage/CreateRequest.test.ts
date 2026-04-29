import { HttpBody } from '@effect/platform'
import { it } from '@effect/vitest'
import { Effect, Redacted } from 'effect'
import { describe, expect } from 'vitest'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import { ChatPostMessageInput } from '../../../../src/ExternalApis/Slack/ChatPostMessage/ChatPostMessageInput.ts'
import * as _ from '../../../../src/ExternalApis/Slack/ChatPostMessage/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('sets the URL', [fc.slackApi(), fc.chatPostMessageInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual('https://slack.com/api/chat.postMessage')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the Accept header', [fc.slackApi(), fc.chatPostMessageInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.slackApi(), fc.chatPostMessageInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the body', [fc.slackApi(), fc.chatPostMessageInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(ChatPostMessageInput)(message)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )
})
