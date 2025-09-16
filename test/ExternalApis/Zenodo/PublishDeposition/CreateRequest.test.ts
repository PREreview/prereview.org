import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.js'
import * as _ from '../../../../src/ExternalApis/Zenodo/PublishDeposition/CreateRequest.js'
import * as EffectTest from '../../../EffectTest.js'
import * as fc from '../fc.js'

describe('CreateRequest', () => {
  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition()])(
    'creates a POST request',
    (zenodoApi, unsubmittedDeposition) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.method).toStrictEqual('POST')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition()])('sets the URL', (zenodoApi, unsubmittedDeposition) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(unsubmittedDeposition)

      expect(actual.url).toStrictEqual(unsubmittedDeposition.links.publish.href)
    }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition()])(
    'sets the Accept header',
    (zenodoApi, unsubmittedDeposition) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.headers['accept']).toStrictEqual('application/json')
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )

  test.prop([fc.zenodoApi(), fc.unsubmittedDeposition()])(
    'sets the Authorization header',
    (zenodoApi, unsubmittedDeposition) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(unsubmittedDeposition)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(zenodoApi.key)}`)
      }).pipe(Effect.provideService(Zenodo.ZenodoApi, zenodoApi), EffectTest.run),
  )
})
