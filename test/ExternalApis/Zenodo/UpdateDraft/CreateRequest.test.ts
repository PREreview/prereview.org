import { Effect, Redacted, Schema } from 'effect'
import { HttpBody } from 'effect/http'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/UpdateDraft/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import draftSample from '../Samples/draft.json' with { type: 'json' }

const draft = Schema.decodeUnknownSync(Zenodo.Draft)(draftSample)

describe('CreateRequest', () => {
  it.effect.prop('creates a PUT request', [fc.zenodoApi()], ([zenodoApi]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(draft)

      expect(actual.method).toStrictEqual('PUT')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi()], ([zenodoApi]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(draft)

      expect(actual.url).toStrictEqual(`${zenodoApi.origin.origin}/api/records/${draft.id}/draft`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi()], ([zenodoApi]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(draft)

      expect(actual.headers['accept']).toStrictEqual('application/vnd.inveniordm.v1+json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi()], ([zenodoApi]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(draft)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the body', [fc.zenodoApi()], ([zenodoApi]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(draft)

      const expected = yield* HttpBody.jsonSchema(Zenodo.Draft)(draft)

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
