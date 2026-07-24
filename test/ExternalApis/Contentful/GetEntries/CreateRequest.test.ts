import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Redacted } from 'effect'
import * as _ from '../../../../src/ExternalApis/Contentful/GetEntries/CreateRequest.ts'
import { ContentfulConfig } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a GET request', [fc.urlParams(), fc.contentfulConfig()], ([params, config]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(params)

      expect(actual.method).toStrictEqual('GET')
    }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop('sets the URL', [fc.urlParams(), fc.contentfulConfig()], ([params, config]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(params)

      expect(actual.url).toStrictEqual(
        `https://cdn.contentful.com/spaces/${config.spaceId}/environments/${config.environmentId}/entries`,
      )
      expect(actual.urlParams).toStrictEqual(params)
    }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop('sets the Accept header', [fc.urlParams(), fc.contentfulConfig()], ([params, config]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(params)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )

  it.effect.prop('sets the Authorization header', [fc.urlParams(), fc.contentfulConfig()], ([params, config]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(params)

      expect(actual.headers['authorization']).toStrictEqual(`Bearer ${Redacted.value(config.accessToken)}`)
    }).pipe(Effect.provide(Layer.succeed(ContentfulConfig, config))),
  )
})
