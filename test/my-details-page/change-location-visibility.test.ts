import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/my-details-page/change-location-visibility.ts'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('changeLocationVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.supportedLocale(),
    fc.location(),
  ])('when there is a logged in user', async (body, method, user, locale, location) => {
    const actual = await _.changeLocationVisibility({ body, locale, method, user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.of(location),
      saveLocation: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLocationVisibilityMatch.formatter, {}),
      status: StatusCodes.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([fc.locationVisibility(), fc.user(), fc.supportedLocale(), fc.location()])(
    'when the form has been submitted',
    async (visibility, user, locale, existingLocation) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocationVisibility({
        body: { locationVisibility: visibility },
        locale,
        method: 'POST',
        user,
      })({
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
        value: existingLocation.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.record({ locationVisibility: fc.locationVisibility() }),
    fc.user(),
    fc.supportedLocale(),
    fc.location(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, locale, location) => {
    const actual = await _.changeLocationVisibility({ body, locale, method: 'POST', user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.of(location),
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
  })

  test.prop([
    fc.record({ locationVisibility: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.location(),
  ])('when the form has been submitted without setting visibility', async (body, user, locale, location) => {
    const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

    const actual = await _.changeLocationVisibility({ body, locale, method: 'POST', user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.of(location),
      saveLocation,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
      value: location.value,
      visibility: 'restricted',
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    "there isn't a location",
    async (body, method, user, locale) => {
      const actual = await _.changeLocationVisibility({ body, locale, method, user })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.left('not-found'),
        saveLocation: shouldNotBeCalled,
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
      const actual = await _.changeLocationVisibility({ body, locale, method, user: undefined })({
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
