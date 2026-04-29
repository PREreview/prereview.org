import { HttpBody } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/UploadFile/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'sets the URL',
    [fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()],
    ([zenodoApi, deposition, file]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(deposition, file)

        expect(actual.url).toStrictEqual(
          `${deposition.links.bucket.origin}${deposition.links.bucket.pathname}/${file.name}`,
        )
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the Authorization header',
    [fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()],
    ([zenodoApi, deposition, file]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(deposition, file)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the body',
    [fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()],
    ([zenodoApi, deposition, file]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(deposition, file)

        const expected = HttpBody.text(file.content, 'application/octet-stream')

        expect(actual.body).toStrictEqual(expected)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
