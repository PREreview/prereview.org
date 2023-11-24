import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-location-visibility'
import { changeLocationVisibilityMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLocationVisibility', () => {
  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.location()])(
    'when there is a logged in user',
    async (body, method, user, location) => {
      const actual = await _.changeLocationVisibility({ body, method, user })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.of(location),
        saveLocation: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeLocationVisibilityMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('location'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('location'),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.locationVisibility(), fc.user(), fc.location()])(
    'when the form has been submitted',
    async (visibility, user, existingLocation) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocationVisibility({
        body: { locationVisibility: visibility },
        method: 'POST',
        user,
      })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.right(existingLocation),
        saveLocation,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
        value: existingLocation.value,
        visibility,
      })
    },
  )

  test.prop([fc.record({ locationVisibility: fc.locationVisibility() }), fc.user(), fc.location()])(
    'when the form has been submitted but the visibility cannot be saved',
    async (body, user, location) => {
      const actual = await _.changeLocationVisibility({ body, method: 'POST', user })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.of(location),
        saveLocation: () => TE.left('unavailable'),
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

  test.prop([fc.record({ locationVisibility: fc.string() }, { withDeletedKeys: true }), fc.user(), fc.location()])(
    'when the form has been submitted without setting visibility',
    async (body, user, location) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocationVisibility({ body, method: 'POST', user })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.of(location),
        saveLocation,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
        value: location.value,
        visibility: 'restricted',
      })
    },
  )

  test.prop([fc.anything(), fc.string(), fc.user()])("there isn't a location", async (body, method, user) => {
    const actual = await _.changeLocationVisibility({ body, method, user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.left('not-found'),
      saveLocation: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeLocationVisibility({ body, method, user: undefined })({
      deleteLocation: shouldNotBeCalled,
      getLocation: shouldNotBeCalled,
      saveLocation: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
