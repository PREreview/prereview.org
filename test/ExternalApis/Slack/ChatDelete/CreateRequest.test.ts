import { HttpBody } from '@effect/platform'
import { it } from '@effect/vitest'
import { Effect, Redacted } from 'effect'
import { describe, expect } from 'vitest'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import { ChatDeleteInput } from '../../../../src/ExternalApis/Slack/ChatDelete/ChatDeleteInput.ts'
import * as _ from '../../../../src/ExternalApis/Slack/ChatDelete/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.slackApi(), fc.chatDeleteInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the URL', [fc.slackApi(), fc.chatDeleteInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual('https://slack.com/api/chat.delete')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the Accept header', [fc.slackApi(), fc.chatDeleteInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.slackApi(), fc.chatDeleteInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the body', [fc.slackApi(), fc.chatDeleteInput()], ([slackApi, message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(ChatDeleteInput)(message)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )
})
