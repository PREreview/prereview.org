import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { EditCareerStageEnv } from '../src/career-stage'
import * as _ from '../src/change-career-stage'
import { myDetailsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('changeCareerStage', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.careerStage()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, careerStage) => {
    const actual = await runMiddleware(
      _.changeCareerStage({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: () => TE.fromEither(careerStage),
        saveCareerStage: shouldNotBeCalled,
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
      fc.careerStageValue().chain(careerStage =>
        fc.tuple(
          fc.constant(careerStage),
          fc.connection({
            body: fc.constant({ careerStage }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
      fc.careerStage(),
    ])(
      'there is a career stage already',
      async (oauth, publicUrl, [careerStage, connection], user, existingCareerStage) => {
        const saveCareerStage = jest.fn<EditCareerStageEnv['saveCareerStage']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeCareerStage({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteCareerStage: shouldNotBeCalled,
            getCareerStage: () => TE.right(existingCareerStage),
            saveCareerStage,
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
        expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, {
          value: careerStage,
          visibility: existingCareerStage.visibility,
        })
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.careerStageValue().chain(careerStage =>
        fc.tuple(
          fc.constant(careerStage),
          fc.connection({
            body: fc.constant({ careerStage }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
    ])("when there isn't a career stage already", async (oauth, publicUrl, [careerStage, connection], user) => {
      const saveCareerStage = jest.fn<EditCareerStageEnv['saveCareerStage']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeCareerStage({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: () => TE.left('not-found'),
          saveCareerStage,
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
      expect(saveCareerStage).toHaveBeenCalledWith(user.orcid, { value: careerStage, visibility: 'restricted' })
    })
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ careerStage: fc.oneof(fc.careerStageValue(), fc.constant('skip')) }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.careerStage()),
  ])(
    'when the form has been submitted but the career stage cannot be saved',
    async (oauth, publicUrl, connection, user, existingCareerStage) => {
      const actual = await runMiddleware(
        _.changeCareerStage({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteCareerStage: () => TE.left('unavailable'),
          getCareerStage: () => TE.fromEither(existingCareerStage),
          saveCareerStage: () => TE.left('unavailable'),
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
      body: fc.constant({ careerStage: 'skip' }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])('when the form has been skipped', async (oauth, publicUrl, connection, user) => {
    const deleteCareerStage = jest.fn<EditCareerStageEnv['deleteCareerStage']>(_ => TE.right(undefined))

    const actual = await runMiddleware(
      _.changeCareerStage({
        getUser: () => M.right(user),
        publicUrl,
        oauth,
        deleteCareerStage,
        getCareerStage: shouldNotBeCalled,
        saveCareerStage: shouldNotBeCalled,
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
    expect(deleteCareerStage).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ careerStage: fc.lorem() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])('when the form has been submitted without setting career stage', async (oauth, publicUrl, connection, user) => {
    const actual = await runMiddleware(
      _.changeCareerStage({
        getUser: () => M.right(user),
        publicUrl,
        oauth,
        deleteCareerStage: shouldNotBeCalled,
        getCareerStage: shouldNotBeCalled,
        saveCareerStage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.BadRequest },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeCareerStage({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: shouldNotBeCalled,
          saveCareerStage: shouldNotBeCalled,
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
        _.changeCareerStage({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          deleteCareerStage: shouldNotBeCalled,
          getCareerStage: shouldNotBeCalled,
          saveCareerStage: shouldNotBeCalled,
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
