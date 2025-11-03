import { HttpBody } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import { ChatPostMessageInput } from '../../../../src/ExternalApis/Slack/ChatPostMessage/ChatPostMessageInput.ts'
import * as _ from '../../../../src/ExternalApis/Slack/ChatPostMessage/CreateRequest.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.slackApi(), fc.chatPostMessageInput()])('sets the URL', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual('https://slack.com/api/chat.postMessage')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatPostMessageInput()])('sets the Accept header', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatPostMessageInput()])('sets the Authorization header', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatPostMessageInput()])('sets the body', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(ChatPostMessageInput)(message)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )
})
