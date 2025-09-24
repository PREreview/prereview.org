import { HttpBody } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/UploadFile/CreateRequest.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()])('sets the URL', (zenodoApi, deposition, file) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(deposition, file)

      expect(actual.url).toStrictEqual(
        `${deposition.links.bucket.origin}${deposition.links.bucket.pathname}/${file.name}`,
      )
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()])(
    'sets the Authorization header',
    (zenodoApi, deposition, file) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(deposition, file)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition(), fc.file()])('sets the body', (zenodoApi, deposition, file) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(deposition, file)

      const expected = HttpBody.text(file.content, 'application/octet-stream')

      expect(actual.body).toStrictEqual(expected)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )
})
