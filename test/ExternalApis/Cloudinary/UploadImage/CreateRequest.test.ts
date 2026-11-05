import { HttpBody } from 'effect/http'
import { Base64 } from 'effect/encoding'
import { TestClock } from 'effect/testing'
import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Redacted } from 'effect'
import { createHash } from 'node:crypto'
import { Cloudinary } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Cloudinary/UploadImage/CreateRequest.ts'
import * as fc from '../fc.ts'

describe('CreateRequest', () => {
  it.effect.prop('creates a POST request', [fc.cloudinaryApi(), fc.uploadImageInput()], ([cloudinaryApi, input]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(input)

      expect(actual.method).toStrictEqual('POST')
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop('sets the URL', [fc.cloudinaryApi(), fc.uploadImageInput()], ([cloudinaryApi, input]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(input)

      expect(actual.url).toStrictEqual(`https://api.cloudinary.com/v1_1/${cloudinaryApi.cloudName}/image/upload`)
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop('sets the Accept header', [fc.cloudinaryApi(), fc.uploadImageInput()], ([cloudinaryApi, input]) =>
    Effect.gen(function* () {
      const actual = yield* _.CreateRequest(input)

      expect(actual.headers['accept']).toStrictEqual('application/json')
    }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )

  it.effect.prop(
    'sets a signed body',
    [
      fc.cloudinaryApi(),
      fc.uploadImageInput(),
      fc.date(),
      fc.constantFrom(
        [{ key: 'value' }, 'key=value'] as const,
        [{ first: 'one', second: 'two' }, 'first=one|second=two'] as const,
        [{ key: 'one=two|three' }, 'key=one\\=two\\|three'] as const,
      ),
    ],
    ([cloudinaryApi, input, date, [context, encodedContext]]) =>
      Effect.gen(function* () {
        yield* TestClock.setTime(date.getTime())

        const actual = yield* _.CreateRequest({ ...input, context })

        const timestamp = Math.round(date.getTime() / 1000)
        const stringToSign = `context=${encodedContext}&folder=${input.folder}&timestamp=${timestamp}`

        expect(actual.body).toStrictEqual(
          HttpBody.urlParams({
            folder: input.folder,
            context: encodedContext,
            timestamp,
            signature: createHash('sha1')
              .update(stringToSign + Redacted.value(cloudinaryApi.secret))
              .digest('hex'),
            api_key: Redacted.value(cloudinaryApi.key),
            file: `data:${input.mimetype};base64,${Base64.encode(input.file)}`,
          }),
        )
      }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )
})
