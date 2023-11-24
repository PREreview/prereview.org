import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-open-for-requests'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeOpenForRequests', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.isOpenForRequests()),
  ])('when there is a logged in user', async (body, method, user, openForRequests) => {
    const actual = await _.changeOpenForRequests({ body, method, user })({
      isOpenForRequests: () => TE.fromEither(openForRequests),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeOpenForRequestsMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('requests'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('requests'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.constantFrom('yes' as const, 'no' as const), fc.user(), fc.isOpenForRequests()])(
      'there is open for requests already',
      async (openForRequests, user, existingOpenForRequests) => {
        const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await _.changeOpenForRequests({ body: { openForRequests }, method: 'POST', user })({
          isOpenForRequests: () => TE.right(existingOpenForRequests),
          saveOpenForRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveOpenForRequests).toHaveBeenCalledWith(
          user.orcid,
          openForRequests === 'yes'
            ? {
                value: true,
                visibility: existingOpenForRequests.value ? existingOpenForRequests.visibility : 'restricted',
              }
            : { value: false },
        )
      },
    )

    test.prop([fc.constantFrom('yes', 'no'), fc.user()])(
      "when there isn't a career stage already",
      async (openForRequests, user) => {
        const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await _.changeOpenForRequests({ body: { openForRequests }, method: 'POST', user })({
          isOpenForRequests: () => TE.left('not-found'),
          saveOpenForRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveOpenForRequests).toHaveBeenCalledWith(
          user.orcid,
          openForRequests === 'yes'
            ? {
                value: true,
                visibility: 'restricted',
              }
            : { value: false },
        )
      },
    )
  })

  test.prop([
    fc.constantFrom('yes', 'no'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const), fc.isOpenForRequests()),
  ])(
    'when the form has been submitted but the career stage cannot be saved',
    async (openForRequests, user, existingOpenForRequests) => {
      const actual = await _.changeOpenForRequests({ body: { openForRequests }, method: 'POST', user })({
        isOpenForRequests: () => TE.fromEither(existingOpenForRequests),
        saveOpenForRequests: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.record({ openForRequests: fc.lorem() }, { withDeletedKeys: true }), fc.user()])(
    'when the form has been submitted without setting open for requests',
    async (body, user) => {
      const actual = await _.changeOpenForRequests({ body, method: 'POST', user })({
        isOpenForRequests: shouldNotBeCalled,
        saveOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeOpenForRequestsMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('requests'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('requests'),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeOpenForRequests({ body, method, user: undefined })({
      isOpenForRequests: shouldNotBeCalled,
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
