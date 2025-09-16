import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.js'
import * as _ from '../../../../src/ExternalApis/Zenodo/GetDeposition/CreateRequest.js'
import * as EffectTest from '../../../EffectTest.js'
import * as fc from '../fc.js'

describe('CreateRequest', () => {
  test.prop([fc.zenodoApi(), fc.integer()])('creates a GET request', (zenodoApi, recordId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.integer()])('sets the URL', (zenodoApi, recordId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/deposit/depositions/${recordId}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.integer()])('sets the Accept header', (zenodoApi, recordId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.integer()])('sets the Authorization header', (zenodoApi, recordId) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )
})
