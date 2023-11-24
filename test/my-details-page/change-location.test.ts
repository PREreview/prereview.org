import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-location'
import { changeLocationMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLocation', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.location()),
  ])('when there is a logged in user', async (body, method, user, location) => {
    const actual = await _.changeLocation({ body, method, user })({
      deleteLocation: shouldNotBeCalled,
      getLocation: () => TE.fromEither(location),
      saveLocation: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeLocationMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('based'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('based'),
      skipToLabel: 'form',
      js: [],
    })
  })

  describe('when the form has been submitted', () => {
    test.prop([fc.nonEmptyString(), fc.user(), fc.location()])(
      'there is a location already',
      async (location, user, existingLocation) => {
        const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

        const actual = await _.changeLocation({ body: { location }, method: 'POST', user })({
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
          value: location,
          visibility: existingLocation.visibility,
        })
      },
    )

    test.prop([fc.nonEmptyString(), fc.user()])("when there isn't a location already", async (location, user) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocation({ body: { location }, method: 'POST', user })({
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.left('not-found'),
        saveLocation,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveLocation).toHaveBeenCalledWith(user.orcid, { value: location, visibility: 'restricted' })
    })
  })

  test.prop([
    fc.record({ location: fc.nonEmptyString() }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.location()),
  ])('when the form has been submitted but the location cannot be saved', async (body, user, existingLocation) => {
    const actual = await _.changeLocation({ body, method: 'POST', user })({
      deleteLocation: () => TE.left('unavailable'),
      getLocation: () => TE.fromEither(existingLocation),
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
  })

  test.prop([fc.record({ location: fc.constant('') }, { withDeletedKeys: true }), fc.user()])(
    'when the form has been submitted without setting a location',
    async (body, user) => {
      const deleteLocation = jest.fn<_.Env['deleteLocation']>(_ => TE.right(undefined))

      const actual = await _.changeLocation({ body, method: 'POST', user })({
        deleteLocation,
        getLocation: shouldNotBeCalled,
        saveLocation: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(deleteLocation).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeLocation({ body, method, user: undefined })({
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
