import { HttpBody } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted, Schema } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/CreateDeposition/CreateRequest.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.zenodoApi(), fc.depositMetadata()])('sets the URL', (zenodoApi, metadata) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/deposit/depositions`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.depositMetadata()])('sets the Accept header', (zenodoApi, metadata) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.depositMetadata()])('sets the Authorization header', (zenodoApi, metadata) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.depositMetadata()])('sets the body', (zenodoApi, metadata) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      const expected = yield* HttpBody.jsonSchema(Schema.Struct({ metadata: Zenodo.DepositMetadata }))({ metadata })

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )
})
