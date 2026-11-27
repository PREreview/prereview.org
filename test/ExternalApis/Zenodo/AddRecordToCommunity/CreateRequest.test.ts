import { Effect, Redacted, Schema } from 'effect'
import { HttpBody } from 'effect/http'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/AddRecordToCommunity/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'creates a POST request',
    [fc.zenodoApi(), fc.integer(), fc.uuid()],
    ([zenodoApi, recordId, communityId]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest({ recordId, communityId })

        expect(actual.method).toStrictEqual('POST')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.integer(), fc.uuid()], ([zenodoApi, recordId, communityId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ recordId, communityId })

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/records/${recordId}/communities`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the Accept header',
    [fc.zenodoApi(), fc.integer(), fc.uuid()],
    ([zenodoApi, recordId, communityId]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest({ recordId, communityId })

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the Authorization header',
    [fc.zenodoApi(), fc.integer(), fc.uuid()],
    ([zenodoApi, recordId, communityId]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest({ recordId, communityId })

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the body', [fc.zenodoApi(), fc.integer(), fc.uuid()], ([zenodoApi, recordId, communityId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ recordId, communityId })

      const expected = yield* HttpBody.jsonSchema(
        Schema.Struct({ communities: Schema.Tuple([Schema.Struct({ id: Schema.String })]) }),
      )({ communities: [{ id: communityId }] })

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
