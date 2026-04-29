import { HttpBody } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted, Schema } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/CreateDeposition/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.depositMetadata()], ([zenodoApi, metadata]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/deposit/depositions`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.depositMetadata()], ([zenodoApi, metadata]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.depositMetadata()], ([zenodoApi, metadata]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the body', [fc.zenodoApi(), fc.depositMetadata()], ([zenodoApi, metadata]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(metadata)

      const expected = yield* HttpBody.jsonSchema(Schema.Struct({ metadata: Zenodo.DepositMetadata }))({ metadata })

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
