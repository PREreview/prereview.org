import { describe, expect, it } from '../../../vitest.ts'
import { Effect } from 'effect'
import { Cloudinary } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalApis/Cloudinary/ImageUrl/index.ts'
import * as fc from '../fc.ts'

describe('ImageUrl', () => {
  it.effect.prop(
    'builds the URL',
    [fc.cloudinaryApi(), fc.nonEmptyStringOf(fc.alphanumeric())],
    ([cloudinaryApi, publicId]) =>
      Effect.gen(function* () {
        const actual = yield* _.ImageUrl(`some-folder/${publicId}`, { crop: 'thumb', width: 300 })

        expect(actual).toStrictEqual(
          new URL(
            `https://res.cloudinary.com/${cloudinaryApi.cloudName}/image/upload/c_thumb,w_300/some-folder/${publicId}`,
          ),
        )
      }).pipe(Effect.provideService(Cloudinary.CloudinaryApi, cloudinaryApi)),
  )
})
