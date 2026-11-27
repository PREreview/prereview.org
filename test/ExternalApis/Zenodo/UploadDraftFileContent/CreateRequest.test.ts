import { Effect, Redacted, Schema } from 'effect'
import { HttpBody } from 'effect/http'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/UploadDraftFileContent/CreateRequest.ts'
import { describe, expect, it } from '../../../vitest.ts'
import * as fc from '../fc.ts'
import draftSample from '../Samples/draft.json' with { type: 'json' }

const draft = Schema.decodeUnknownSync(Zenodo.Draft)(draftSample)

describe('CreateRequest', () => {
  it.effect.prop('creates a PUT request', [fc.zenodoApi(), fc.file()], ([zenodoApi, file]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, file })

      expect(actual.method).toStrictEqual('PUT')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.file()], ([zenodoApi, file]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, file })

      expect(actual.url).toStrictEqual(
        `${zenodoApi.origin.origin}/api/records/${draft.id}/draft/files/${encodeURIComponent(file.name)}/content`,
      )
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Accept header', [fc.zenodoApi(), fc.file()], ([zenodoApi, file]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, file })

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the Authorization header', [fc.zenodoApi(), fc.file()], ([zenodoApi, file]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, file })

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the body', [fc.zenodoApi(), fc.file()], ([zenodoApi, file]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest({ draft, file })

      expect(actual.body).toStrictEqual(HttpBody.text(file.content, 'application/octet-stream'))
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
