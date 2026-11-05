import type { Cloudinary } from '../../../src/ExternalApis/index.ts'
import type { UploadImageInput } from '../../../src/ExternalApis/Cloudinary/UploadImage/UploadImageInput.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const cloudinaryApi = (): fc.Arbitrary<typeof Cloudinary.CloudinaryApi.Service> =>
  fc.record({
    cloudName: fc.lorem({ maxCount: 1 }),
    key: fc.redacted(fc.string({ unit: fc.alphanumeric(), minLength: 1 })),
    secret: fc.redacted(fc.string({ unit: fc.alphanumeric(), minLength: 1 })),
  })

export const uploadImageInput = (): fc.Arbitrary<UploadImageInput> =>
  fc.record({
    file: fc.string().map(string => Buffer.from(string)),
    mimetype: fc.string(),
    folder: fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    context: fc.dictionary(fc.string(), fc.string()),
  })
