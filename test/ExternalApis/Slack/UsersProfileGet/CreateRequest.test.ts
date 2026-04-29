import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted, Struct } from 'effect'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Slack/UsersProfileGet/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'creates a GET request',
    [fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))],
    ([slackApi, userId]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(userId)

        expect(actual.method).toStrictEqual('GET')
      }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop('sets the URL', [fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))], ([slackApi, userId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(userId)

      expect(actual.url).toStrictEqual('https://slack.com/api/users.profile.get')
      expect(actual.urlParams).toStrictEqual(UrlParams.fromInput({ user: userId }))
    }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop(
    'sets the Accept header',
    [fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))],
    ([slackApi, message]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(message)

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )

  it.effect.prop(
    'sets the Authorization header',
    [fc.slackApi(), fc.slackUserId().map(Struct.get('userId'))],
    ([slackApi, message]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(message)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(slackApi.apiToken)}`)
      }).pipe(Effect.provideService(Slack.SlackApi, slackApi)),
  )
})
