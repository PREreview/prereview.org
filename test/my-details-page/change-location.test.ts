import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/change-location'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLocation', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.location()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, location) => {
    const actual = await runMiddleware(
      _.changeLocation({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteLocation: shouldNotBeCalled,
        getLocation: () => TE.fromEither(location),
        saveLocation: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  describe('when the form has been submitted', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.nonEmptyString().chain(location =>
        fc.tuple(
          fc.constant(location),
          fc.connection({
            body: fc.constant({ location }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
      fc.location(),
    ])('there is a location already', async (oauth, publicUrl, [location, connection], user, existingLocation) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLocation({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLocation: shouldNotBeCalled,
          getLocation: () => TE.right(existingLocation),
          saveLocation,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
          { type: 'endResponse' },
        ]),
      )
      expect(saveLocation).toHaveBeenCalledWith(user.orcid, {
        value: location,
        visibility: existingLocation.visibility,
      })
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.nonEmptyString().chain(location =>
        fc.tuple(
          fc.constant(location),
          fc.connection({
            body: fc.constant({ location }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
    ])("when there isn't a location already", async (oauth, publicUrl, [location, connection], user) => {
      const saveLocation = jest.fn<_.Env['saveLocation']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLocation({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLocation: shouldNotBeCalled,
          getLocation: () => TE.left('not-found'),
          saveLocation,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
          { type: 'endResponse' },
        ]),
      )
      expect(saveLocation).toHaveBeenCalledWith(user.orcid, { value: location, visibility: 'restricted' })
    })
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ location: fc.oneof(fc.nonEmptyString(), fc.constant('skip')) }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.location()),
  ])(
    'when the form has been submitted but the location cannot be saved',
    async (oauth, publicUrl, connection, user, existingLocation) => {
      const actual = await runMiddleware(
        _.changeLocation({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLocation: () => TE.left('unavailable'),
          getLocation: () => TE.fromEither(existingLocation),
          saveLocation: () => TE.left('unavailable'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ location: fc.constant('') }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])('when the form has been submitted without setting a location', async (oauth, publicUrl, connection, user) => {
    const deleteLocation = jest.fn<_.Env['deleteLocation']>(_ => TE.right(undefined))

    const actual = await runMiddleware(
      _.changeLocation({
        getUser: () => M.right(user),
        publicUrl,
        oauth,
        deleteLocation,
        getLocation: shouldNotBeCalled,
        saveLocation: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
        { type: 'endResponse' },
      ]),
    )
    expect(deleteLocation).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeLocation({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          deleteLocation: shouldNotBeCalled,
          getLocation: shouldNotBeCalled,
          saveLocation: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(myDetailsMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeLocation({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          deleteLocation: shouldNotBeCalled,
          getLocation: shouldNotBeCalled,
          saveLocation: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})
