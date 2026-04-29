import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/GetDeposition/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a GET request', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/deposit/depositions/${recordId}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
