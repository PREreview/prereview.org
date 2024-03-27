import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/remove-avatar'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('removeAvatar', () => {
  test.prop([fc.user()])('when the avatar can be deleted', async user => {
    const deleteAvatar = jest.fn<_.Env['deleteAvatar']>(_ => TE.right(undefined))

    const actual = await _.removeAvatar({ method: 'POST', user })({
      deleteAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constantFrom('image/jpeg', 'image/png'),
    }),
    fc.user(),
  ])("when the avatar can't be deleted", async (file, user) => {
    const deleteAvatar = jest.fn<_.Env['deleteAvatar']>(_ => TE.left('unavailable'))

    const actual = await _.removeAvatar({ method: 'POST', user })({
      deleteAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
    expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.string().filter(method => method !== 'POST'), fc.user()])(
    'when the form needs to be submitted',
    async (method, user) => {
      const actual = await _.removeAvatar({ method, user })({
        deleteAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.removeAvatar({ method })({
      deleteAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
