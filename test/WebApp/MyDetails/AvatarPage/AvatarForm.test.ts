import { Multipart } from 'effect/http'
import { describe, expect, it } from '../../../vitest.ts'
import { Inspectable, Result } from 'effect'
import * as _ from '../../../../src/WebApp/MyDetails/AvatarPage/AvatarForm.ts'
import * as fc from '../../../fc.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'

const persistedFile = (contentType: fc.Arbitrary<string>): fc.Arbitrary<Multipart.PersistedFile> =>
  fc.record({ key: fc.string(), name: fc.string(), contentType, path: fc.string() }).map(args => ({
    [Multipart.TypeId]: Multipart.TypeId,
    _tag: 'PersistedFile',
    ...args,
    toJSON: shouldNotBeCalled,
    [Inspectable.NodeInspectSymbol]: shouldNotBeCalled,
  }))

const imageTypes = ['image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'] as const

describe('fromBody', () => {
  it.prop('when it is an image', [persistedFile(fc.constantFrom(...imageTypes))], ([file]) => {
    expect(_.fromBody(Result.succeed({ avatar: [file] }))).toStrictEqual(
      new _.CompletedForm({ avatar: { path: file.path, mimetype: file.contentType as (typeof imageTypes)[number] } }),
    )
  })

  it.prop(
    'when it is not an image',
    [persistedFile(fc.string().filter(type => !(imageTypes as ReadonlyArray<string>).includes(type)))],
    ([file]) => {
      expect(_.fromBody(Result.succeed({ avatar: [file] }))).toStrictEqual(
        new _.InvalidForm({ avatar: new _.WrongType() }),
      )
    },
  )

  it.prop(
    'when it is too big',
    [fc.constantFrom('FileTooLarge', 'FieldTooLarge', 'BodyTooLarge', 'InternalError'), fc.anything()],
    ([reason, cause]) => {
      expect(_.fromBody(Result.fail(Multipart.MultipartError.fromReason(reason, cause)))).toStrictEqual(
        new _.InvalidForm({ avatar: new _.TooBig() }),
      )
    },
  )

  it.prop('when it cannot be parsed', [fc.constantFrom('TooManyParts', 'Parse'), fc.anything()], ([reason, cause]) => {
    expect(_.fromBody(Result.fail(Multipart.MultipartError.fromReason(reason, cause)))).toStrictEqual(
      new _.InvalidForm({ avatar: new _.Missing() }),
    )
  })

  it.prop('when it is missing', [fc.constantFrom({}, { avatar: [] }, { avatar: 'a string' })], ([body]) => {
    expect(_.fromBody(Result.succeed(body))).toStrictEqual(new _.InvalidForm({ avatar: new _.Missing() }))
  })
})
