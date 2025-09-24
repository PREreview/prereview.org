import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/change-location.ts'
import { changeLocationMatch, myDetailsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('changeLocation', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.location()),
  ])('when there is a logged in user', async (body, method, user, locale, location) => {
    const actual = await _.changeLocation({ body, locale, method, user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.fromEither(location),
      saveLocation: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLocationMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale(), fc.location()])(
      'there is a location already',
      async (location, user, locale, existingLocation) => {
        const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

        const actual = await _.changeLocation({ body: { location }, locale, method: 'POST', user })({
          deleteLocation: shouldNotBeCalled,
          getLocation: () => TE.right(existingLocation),
          saveLocation,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
          value: location,
          visibility: existingLocation.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user(), fc.supportedLocale()])(
      "when there isn't a location already",
      async (location, user, locale) => {
        const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

        const actual = await _.changeLocation({ body: { location }, locale, method: 'POST', user })({
          deleteLocation: shouldNotBeCalled,
          getLocation: () => TE.left('not-found'),
          saveLocation,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(saveLocation).toHaveBeenCalledWith(user.orcid, { value: location, visibility: 'restricted' })
      },
    )
  })

  test.prop([
    fc.record({ location: fc.nonEmptyString() }),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constantFrom('not-found', 'unavailable'), fc.location()),
  ])(
    'when the form has been submitted but the location cannot be saved',
    async (body, user, locale, existingLocation) => {
      const actual = await _.changeLocation({ body, locale, method: 'POST', user })({
        deleteLocation: () => TE.left('unavailable'),
        getLocation: () => TE.fromEither(existingLocation),
        saveLocation: () => TE.left('unavailable'),
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

  test.prop([fc.record({ location: fc.constant('') }, { requiredKeys: [] }), fc.user(), fc.supportedLocale()])(
    'when the form has been submitted without setting a location',
    async (body, user, locale) => {
      const deleteLocation = jest.fn<_.Env['deleteLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocation({ body, locale, method: 'POST', user })({
        deleteLocation,
        getLocation: shouldNotBeCalled,
        saveLocation: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteLocation).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeLocation({ body, locale, method, user: undefined })({
        deleteLocation: shouldNotBeCalled,
        getLocation: shouldNotBeCalled,
        saveLocation: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
