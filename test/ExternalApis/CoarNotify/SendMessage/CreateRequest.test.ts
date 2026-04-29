import { HttpBody, UrlParams } from '@effect/platform'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/CoarNotify/SendMessage/CreateRequest.ts'
import { CoarNotify } from '../../../../src/ExternalApis/index.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.coarNotifyMessage()], ([message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.method).toStrictEqual('POST')
    }),
  )

  it.effect.prop('sets the URL', [fc.coarNotifyMessage()], ([message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      expect(actual.url).toStrictEqual(`${message.target.inbox.origin}${message.target.inbox.pathname}`)
      expect(actual.urlParams).toStrictEqual(UrlParams.fromInput(message.target.inbox.searchParams))
    }),
  )

  it.effect.prop('sets the body', [fc.coarNotifyMessage()], ([message]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(message)

      const expected = yield* HttpBody.jsonSchema(CoarNotify.MessageSchema)(message)

      expect(actual.body).toStrictEqual(expected)
    }),
  )
})
