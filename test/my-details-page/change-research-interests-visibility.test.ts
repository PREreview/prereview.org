import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/change-research-interests-visibility'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeResearchInterestsVisibility', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.researchInterests(),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, researchInterests) => {
    const actual = await runMiddleware(
      _.changeResearchInterestsVisibility({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteResearchInterests: shouldNotBeCalled,
        getResearchInterests: () => TE.of(researchInterests),
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
    fc.researchInterestsVisibility().chain(visibility =>
      fc.tuple(
        fc.constant(visibility),
        fc.connection({
          body: fc.constant({ researchInterestsVisibility: visibility }),
          method: fc.constant('POST'),
        }),
      ),
    ),
    fc.user(),
    fc.researchInterests(),
  ])(
    'when the form has been submitted',
    async (oauth, publicUrl, [visibility, connection], user, existingResearchInterests) => {
      const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.right(existingResearchInterests),
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
      expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
        value: existingResearchInterests.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ researchInterestsVisibility: fc.researchInterestsVisibility() }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.researchInterests(),
  ])(
    'when the form has been submitted but the visibility cannot be saved',
    async (oauth, publicUrl, connection, user, researchInterests) => {
      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.of(researchInterests),
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
      body: fc.record({ researchInterestsVisibility: fc.string() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.researchInterests(),
  ])(
    'when the form has been submitted without setting visibility',
    async (oauth, publicUrl, connection, user, researchInterests) => {
      const saveResearchInterests = jest.fn<_.Env['saveResearchInterests']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.of(researchInterests),
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
      expect(saveResearchInterests).toHaveBeenCalledWith(user.orcid, {
        value: researchInterests.value,
        visibility: 'restricted',
      })
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.user()])(
    "there aren't research interests",
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteResearchInterests: shouldNotBeCalled,
          getResearchInterests: () => TE.left('not-found'),
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
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
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

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeResearchInterestsVisibility({
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
