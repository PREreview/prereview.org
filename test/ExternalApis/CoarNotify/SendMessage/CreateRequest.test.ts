import { HttpBody, UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import * as _ from '../../../../src/ExternalApis/CoarNotify/SendMessage/CreateRequest.ts'
import { CoarNotify } from '../../../../src/ExternalApis/index.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.coarNotifyMessage()])('creates a POST request', message =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(EffectTest.run),
  )

  test.prop([fc.coarNotifyMessage()])('sets the URL', message =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual(`${message.target.inbox.origin}${message.target.inbox.pathname}`)
      expect(actual.urlParams).toStrictEqual(UrlParams.fromInput(message.target.inbox.searchParams))
    }).pipe(EffectTest.run),
  )

  test.prop([fc.coarNotifyMessage()])('sets the body', message =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(CoarNotify.MessageSchema)(message)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(EffectTest.run),
  )
})
