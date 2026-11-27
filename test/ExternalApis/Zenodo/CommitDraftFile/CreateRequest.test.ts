import { Effect, Redacted, Schema } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/CommitDraftFile/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import draftSample from '../Samples/draft.json' with { type: 'json' }

const draft = Schema.decodeUnknownSync(Zenodo.Draft)(draftSample)

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.zenodoApi(), fc.string()], ([zenodoApi, key]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, key })

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.string()], ([zenodoApi, key]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, key })

      expect(actual.url).toStrictEqual(
        `${zenodoApi.origin.origin}/api/records/${draft.id}/draft/files/${encodeURIComponent(key)}/commit`,
      )
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.string()], ([zenodoApi, key]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, key })

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.string()], ([zenodoApi, key]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, key })

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
