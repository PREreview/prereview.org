import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/change-languages-visibility'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLanguagesVisibility', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.languages(),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, languages) => {
    const actual = await runMiddleware(
      _.changeLanguagesVisibility({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.of(languages),
        saveLanguages: shouldNotBeCalled,
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
    fc.languagesVisibility().chain(visibility =>
      fc.tuple(
        fc.constant(visibility),
        fc.connection({
          body: fc.constant({ languagesVisibility: visibility }),
          method: fc.constant('POST'),
        }),
      ),
    ),
    fc.user(),
    fc.languages(),
  ])(
    'when the form has been submitted',
    async (oauth, publicUrl, [visibility, connection], user, existingLanguages) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLanguagesVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.right(existingLanguages),
          saveLanguages,
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
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
        value: existingLanguages.value,
        visibility,
      })
    },
  )

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ languagesVisibility: fc.languagesVisibility() }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.languages(),
  ])(
    'when the form has been submitted but the visibility cannot be saved',
    async (oauth, publicUrl, connection, user, languages) => {
      const actual = await runMiddleware(
        _.changeLanguagesVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.of(languages),
          saveLanguages: () => TE.left('unavailable'),
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
      body: fc.record({ languagesVisibility: fc.string() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.languages(),
  ])(
    'when the form has been submitted without setting visibility',
    async (oauth, publicUrl, connection, user, languages) => {
      const saveLanguages = jest.fn<_.Env['saveLanguages']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLanguagesVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.of(languages),
          saveLanguages,
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
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, {
        value: languages.value,
        visibility: 'restricted',
      })
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.user()])(
    "there aren't languages",
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeLanguagesVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.left('not-found'),
          saveLanguages: shouldNotBeCalled,
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
        _.changeLanguagesVisibility({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: shouldNotBeCalled,
          saveLanguages: shouldNotBeCalled,
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
        _.changeLanguagesVisibility({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: shouldNotBeCalled,
          saveLanguages: shouldNotBeCalled,
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
