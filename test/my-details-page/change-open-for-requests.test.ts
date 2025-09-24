import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/change-open-for-requests.ts'
import { changeOpenForRequestsMatch, myDetailsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('changeOpenForRequests', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.isOpenForRequests()),
  ])('when there is a logged in user', async (body, method, user, locale, openForRequests) => {
    const actual = await _.changeOpenForRequests({ body, locale, method, user })({
      isOpenForRequests: () => TE.fromEither(openForRequests),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeOpenForRequestsMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.constantFrom('yes', 'no'), fc.user(), fc.supportedLocale(), fc.isOpenForRequests()])(
      'there is open for requests already',
      async (openForRequests, user, locale, existingOpenForRequests) => {
        const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
          isOpenForRequests: () => TE.right(existingOpenForRequests),
          saveOpenForRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
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

    test.prop([fc.constantFrom('yes', 'no'), fc.user(), fc.supportedLocale()])(
      "when there isn't a career stage already",
      async (openForRequests, user, locale) => {
        const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
          isOpenForRequests: () => TE.left('not-found'),
          saveOpenForRequests,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
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
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found'), fc.isOpenForRequests()),
  ])(
    'when the form has been submitted but the career stage cannot be saved',
    async (openForRequests, user, locale, existingOpenForRequests) => {
      const actual = await _.changeOpenForRequests({ body: { openForRequests }, locale, method: 'POST', user })({
        isOpenForRequests: () => TE.fromEither(existingOpenForRequests),
        saveOpenForRequests: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.record({ openForRequests: fc.lorem() }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()])(
    'when the form has been submitted without setting open for requests',
    async (body, user, locale) => {
      const actual = await _.changeOpenForRequests({ body, locale, method: 'POST', user })({
        isOpenForRequests: shouldNotBeCalled,
        saveOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeOpenForRequestsMatch.formatter, {}),
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeOpenForRequests({ body, locale, method, user: undefined })({
        isOpenForRequests: shouldNotBeCalled,
        saveOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
