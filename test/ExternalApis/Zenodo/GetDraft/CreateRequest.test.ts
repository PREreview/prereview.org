import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/GetDraft/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
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

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/records/${recordId}/draft`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['accept']).toStrictEqual('application/vnd.inveniordm.v1+json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.integer()], ([zenodoApi, recordId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(recordId)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
