import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Redacted } from 'effect'
import * as _ from '../../../../src/ExternalApis/Contentful/GetEntry/CreateRequest.ts'
import { ContentfulConfig } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop(
    'creates a GET request',
    [fc.contentfulId(), fc.urlParams(), fc.contentfulConfig()],
    ([id, params, config]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(id, params)

        expect(actual.method).toStrictEqual('GET')
      }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop('sets the URL', [fc.contentfulId(), fc.urlParams(), fc.contentfulConfig()], ([id, params, config]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(id, params)

      expect(actual.url).toStrictEqual(
        `https://cdn.contentful.com/spaces/${config.spaceId}/environments/${config.environmentId}/entries/${id}`,
      )
      expect(actual.urlParams).toStrictEqual(params)
    }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop(
    'sets the Accept header',
    [fc.contentfulId(), fc.urlParams(), fc.contentfulConfig()],
    ([id, params, config]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(id, params)

        expect(actual.headers['accept']).toStrictEqual('application/vnd.contentful.delivery.v1+json')
      }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop(
    'sets the Authorization header',
    [fc.contentfulId(), fc.urlParams(), fc.contentfulConfig()],
    ([id, params, config]) =>
      Effect.gen(function* () {
        const actual = yield* _.CreateRequest(id, params)

        expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(config.accessToken)}`)
      }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )
})
