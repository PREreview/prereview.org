import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-avatar'
import { changeAvatarMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeAvatar', () => {
  describe('when avatars can be uploaded', () => {
    test.prop([fc.user()])('when the form has been submitted', async user => {
      const actual = await _.changeAvatar({ method: 'POST', user })({
        canUploadAvatar: () => true,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.string().filter(method => method !== 'POST'), fc.user()])(
      'when the form needs to be submitted',
      async (method, user) => {
        const actual = await _.changeAvatar({ method, user })({
          canUploadAvatar: () => true,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('avatar'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('avatar'),
          skipToLabel: 'form',
          js: [],
        })
      },
    )
  })

  test.prop([fc.string(), fc.user()])("when avatars can't be uploaded", async (method, user) => {
    const canUploadAvatar = jest.fn<_.Env['canUploadAvatar']>(_ => false)

    const actual = await _.changeAvatar({ method, user })({
      canUploadAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
    expect(canUploadAvatar).toHaveBeenCalledWith(user)
  })

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.changeAvatar({ method })({
      canUploadAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
