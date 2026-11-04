import { HttpBody } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Redacted } from 'effect'
import * as _ from '../../../../src/ExternalApis/Slack/UsersProfileSet/CreateRequest.ts'
import { UsersProfileSetInput } from '../../../../src/ExternalApis/Slack/UsersProfileSet/UsersProfileSetInput.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'creates a POST request',
    [fc.usersProfileSetInput(), fc.redacted(fc.string())],
    ([input, userToken]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(input, userToken)

        expect(actual.method).toStrictEqual('POST')
      }),
  )

  it.effect.prop('sets the URL', [fc.usersProfileSetInput(), fc.redacted(fc.string())], ([input, userToken]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(input, userToken)

      expect(actual.url).toStrictEqual('https://slack.com/api/users.profile.set')
    }),
  )

  it.effect.prop(
    'sets the Accept header',
    [fc.usersProfileSetInput(), fc.redacted(fc.string())],
    ([input, userToken]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(input, userToken)

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }),
  )

  it.effect.prop(
    'sets the Authorization header with the user token',
    [fc.usersProfileSetInput(), fc.redacted(fc.string())],
    ([input, userToken]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(input, userToken)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(userToken)}`)
      }),
  )

  it.effect.prop('sets the body', [fc.usersProfileSetInput(), fc.redacted(fc.string())], ([input, userToken]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(input, userToken)

      const expected = yield* HttpBody.jsonSchema(UsersProfileSetInput)(input)

      expect(actual.body).toStrictEqual(expected)
    }),
  )
})
