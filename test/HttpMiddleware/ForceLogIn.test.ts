import { HttpServerRequest, HttpServerResponse, Url } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as _ from '../../src/HttpMiddleware/ForceLogIn.ts'
import * as OrcidOauth from '../../src/OrcidOauth.ts'
import { PublicUrl } from '../../src/public-url.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { OrcidLocale } from '../../src/types/index.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('forceLogIn', () => {
  it.prop([
    fc.supportedLocale(),
    fc.origin(),
    fc.url().chain(url => fc.tuple(fc.constant(url), fc.httpServerRequest({ url: fc.constant(url) }))),
  ])('returns the expected path without a locale for %s', (locale, publicUrl, [url, request]) =>
    Effect.gen(function* () {
      const actual = yield* _.forceLogIn

      expect(actual).toStrictEqual(
        HttpServerResponse.redirect(
          new URL(
            `?${new URLSearchParams({
              client_id: 'id',
              lang: OrcidLocale.fromSupportedLocale(locale),
              response_type: 'code',
              redirect_uri: new URL('/orcid', publicUrl).toString(),
              scope: '/authenticate',
              state: Url.mutate(url, url => {
                url.protocol = publicUrl.protocol
                url.host = publicUrl.host
              }).href,
            }).toString()}`,
            new URL('http://orcid.test/oauth/authorize'),
          ),
          { status: StatusCodes.Found },
        ),
      )
    }).pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, request),
      Effect.provideService(PublicUrl, publicUrl),
      Effect.provideService(Locale, locale),
      Effect.provide(
        OrcidOauth.layer({ url: new URL('http://orcid.test'), clientId: 'id', clientSecret: Redacted.make('secret') }),
      ),
      EffectTest.run,
    ),
  )
})
