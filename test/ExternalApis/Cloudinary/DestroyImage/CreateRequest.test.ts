import { HttpBody } from 'effect/http'
import { TestClock } from 'effect/testing'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Redacted } from 'effect'
import { createHash } from 'node:crypto'
import { Cloudinary } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Cloudinary/DestroyImage/CreateRequest.ts'
import * as fc from '../fc.ts'

const publicId = () => fc.nonEmptyStringOf(fc.alphanumeric())

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.cloudinaryApi(), publicId()], ([cloudinaryApi, publicId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(publicId)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop('sets the URL', [fc.cloudinaryApi(), publicId()], ([cloudinaryApi, publicId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(publicId)

      expect(actual.url).toStrictEqual(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/destroy`)
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop('sets the Accept header', [fc.cloudinaryApi(), publicId()], ([cloudinaryApi, publicId]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(publicId)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop('sets a signed body', [fc.cloudinaryApi(), publicId(), fc.date()], ([cloudinaryApi, publicId, date]) =>
    Effect.gen(function* () {
      yield* TestClock.setTime(date.getTime())

      const actual = yield* _.CreateRequest(publicId)

      const timestamp = Math.round(date.getTime() / 1000)
      const stringToSign = `public_id=${publicId}&timestamp=${timestamp}`

      expect(actual.body).toStrictEqual(
        HttpBody.urlParams({
          public_id: publicId,
          timestamp,
          signature: createHash('sha1')
            .update(stringToSign + Redacted.value(cloudinaryApi.secret))
            .digest('hex'),
          api_key: Redacted.value(cloudinaryApi.key),
        }),
      )
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )
})
