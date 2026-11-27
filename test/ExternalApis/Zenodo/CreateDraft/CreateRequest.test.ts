import { Effect, Redacted } from 'effect'
import { HttpBody } from 'effect/http'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/CreateDraft/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.zenodoApi(), fc.newDraft()], ([zenodoApi, newDraft]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(newDraft)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.newDraft()], ([zenodoApi, newDraft]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(newDraft)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/records`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.newDraft()], ([zenodoApi, newDraft]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(newDraft)

      expect(actual.headers['accept']).toStrictEqual('application/vnd.inveniordm.v1+json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.newDraft()], ([zenodoApi, newDraft]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(newDraft)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the body', [fc.zenodoApi(), fc.newDraft()], ([zenodoApi, newDraft]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(newDraft)

      const expected = yield* HttpBody.jsonSchema(Zenodo.NewDraft)(newDraft)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
