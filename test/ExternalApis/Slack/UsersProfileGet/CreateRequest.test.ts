import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted, Struct } from 'effect'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Slack/UsersProfileGet/CreateRequest.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))])('creates a GET request', (slackApi, userId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(userId)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))])('sets the URL', (slackApi, userId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(userId)

      expect(actual.url).toStrictEqual('https://slack.com/api/users.profile.get')
      expect(actual.urlParams).toStrictEqual(UrlParams.fromInput({ user: userId }))
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))])(
    'sets the Accept header',
    (slackApi, message) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(message)

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )

  test.prop([fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))])(
    'sets the Authorization header',
    (slackApi, message) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(message)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
      }).pipe(Effect.provideService(Slack.SlackApi, slackApi), EffectTest.run),
  )
})
