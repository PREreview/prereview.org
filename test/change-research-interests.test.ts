import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/change-research-interests'
import { myDetailsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('changeResearchInterests', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.nonEmptyString()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, researchInterests) => {
    const actual = await runMiddleware(
      _.changeResearchInterests({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: () => TE.fromEither(researchInterests),
        saveResearchInterests: shouldNotBeCalled,
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

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.nonEmptyString().chain(researchInterests =>
      fc.tuple(
        fc.constant(researchInterests),
        fc.connection({
          body: fc.constant({ researchInterests }),
          method: fc.constant('POST'),
        }),
      ),
    ),
    fc.user(),
  ])('when the form has been submitted', async (oauth, publicUrl, [researchInterests, connection], user) => {
    const saveResearchInterests: Mock<_.EditResearchInterestsEnv['saveResearchInterests']> = jest.fn(_ =>
      TE.right(undefined),
    )

    const actual = await runMiddleware(
      _.changeResearchInterests({
        getUser: () => M.right(user),
        publicUrl,
        oauth,
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: shouldNotBeCalled,
        saveResearchInterests,
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
    expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, researchInterests)
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ researchInterests: fc.string() }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])(
    'when the form has been submitted but the research interests cannot be saved',
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeResearchInterests({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests: () => TE.left('unavailable'),
          getResearchInterests: shouldNotBeCalled,
          saveResearchInterests: () => TE.left('unavailable'),
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
      body: fc.record({ researchInterests: fc.constant('') }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])(
    'when the form has been submitted without setting research interests',
    async (oauth, publicUrl, connection, user) => {
      const deleteResearchInterests: Mock<_.EditResearchInterestsEnv['deleteResearchInterests']> = jest.fn(_ =>
        TE.right(undefined),
      )

      const actual = await runMiddleware(
        _.changeResearchInterests({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests,
          getResearchInterests: shouldNotBeCalled,
          saveResearchInterests: shouldNotBeCalled,
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
      expect(deleteResearchInterests).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeResearchInterests({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
          saveResearchInterests: shouldNotBeCalled,
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
        _.changeResearchInterests({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
          saveResearchInterests: shouldNotBeCalled,
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
