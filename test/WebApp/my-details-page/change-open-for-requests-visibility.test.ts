import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-open-for-requests-visibility.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeOpenForRequestsVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.isOpenForRequestsVisibility(),
  ])('when there is a logged in user', async (body, method, user, locale, visibility) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, locale, method, user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeOpenForRequestsVisibilityMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([fc.isOpenForRequestsVisibility(), fc.user(), fc.supportedLocale(), fc.isOpenForRequestsVisibility()])(
    'when the form has been submitted',
    async (visibility, user, locale, existingVisibility) => {
      const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

      const actual = await _.changeOpenForRequestsVisibility({
        body: { openForRequestsVisibility: visibility },
        locale,
        method: 'POST',
        user,
      })({
        isOpenForRequests: () => TE.right({ value: true, visibility: existingVisibility }),
        saveOpenForRequests,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility })
    },
  )

  test.prop([
    fc.record({ openForRequestsVisibility: fc.isOpenForRequestsVisibility() }),
    fc.user(),
    fc.supportedLocale(),
    fc.isOpenForRequestsVisibility(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, locale, visibility) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, locale, method: 'POST', user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
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
  })

  test.prop([
    fc.record({ openForRequestsVisibility: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.isOpenForRequestsVisibility(),
  ])('when the form has been submitted without setting visibility', async (body, user, locale, visibility) => {
    const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

    const actual = await _.changeOpenForRequestsVisibility({ body, locale, method: 'POST', user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
      saveOpenForRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility: 'restricted' })
  })

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when not open to requests',
    async (body, method, user, locale) => {
      const actual = await _.changeOpenForRequestsVisibility({ body, locale, method, user })({
        isOpenForRequests: () => TE.right({ value: false }),
        saveOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    "there isn't open to requests",
    async (body, method, user, locale) => {
      const actual = await _.changeOpenForRequestsVisibility({ body, locale, method, user })({
        isOpenForRequests: () => TE.left('not-found'),
        saveOpenForRequests: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeOpenForRequestsVisibility({ body, locale, method, user: undefined })({
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
