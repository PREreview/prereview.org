import { HttpBody } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import { ChatDeleteInput } from '../../../../src/ExternalApis/Slack/ChatDelete/ChatDeleteInput.ts'
import * as _ from '../../../../src/ExternalApis/Slack/ChatDelete/CreateRequest.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.slackApi(), fc.chatDeleteInput()])('creates a POST request', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatDeleteInput()])('sets the URL', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual('https://slack.com/api/chat.delete')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatDeleteInput()])('sets the Accept header', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatDeleteInput()])('sets the Authorization header', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.chatDeleteInput()])('sets the body', (slackApi, message) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(ChatDeleteInput)(message)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )
})
