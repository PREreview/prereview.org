import { describe, expect, it } from '@effect/vitest'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Zenodo/PublishDeposition/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'creates a POST request',
    [fc.zenodoApi(), fc.unsubmittedDeposition()],
    ([zenodoApi, unsubmittedDeposition]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.method).toStrictEqual('POST')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop('sets the URL', [fc.zenodoApi(), fc.unsubmittedDeposition()], ([zenodoApi, unsubmittedDeposition]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(unsubmittedDeposition)

      expect(actual.url).toStrictEqual(unsubmittedDeposition.links.publish.href)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the Accept header',
    [fc.zenodoApi(), fc.unsubmittedDeposition()],
    ([zenodoApi, unsubmittedDeposition]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )

  it.effect.prop(
    'sets the Authorization header',
    [fc.zenodoApi(), fc.unsubmittedDeposition()],
    ([zenodoApi, unsubmittedDeposition]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi)),
  )
})
