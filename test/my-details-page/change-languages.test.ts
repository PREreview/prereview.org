import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { EditLanguagesEnv } from '../../src/languages'
import * as _ from '../../src/my-details-page/change-languages'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeLanguages', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.languages()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, languages) => {
    const actual = await runMiddleware(
      _.changeLanguages({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteLanguages: shouldNotBeCalled,
        getLanguages: () => TE.fromEither(languages),
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

  describe('when the form has been submitted', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.nonEmptyString().chain(languages =>
        fc.tuple(
          fc.constant(languages),
          fc.connection({
            body: fc.constant({ languages }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
      fc.languages(),
    ])('there are languages already', async (oauth, publicUrl, [languages, connection], user, existingLanguages) => {
      const saveLanguages = jest.fn<EditLanguagesEnv['saveLanguages']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLanguages({
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
        value: languages,
        visibility: existingLanguages.visibility,
      })
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.nonEmptyString().chain(languages =>
        fc.tuple(
          fc.constant(languages),
          fc.connection({
            body: fc.constant({ languages }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
    ])("when there aren't languages already", async (oauth, publicUrl, [languages, connection], user) => {
      const saveLanguages = jest.fn<EditLanguagesEnv['saveLanguages']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeLanguages({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: shouldNotBeCalled,
          getLanguages: () => TE.left('not-found'),
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
      expect(saveLanguages).toHaveBeenCalledWith(user.orcid, { value: languages, visibility: 'restricted' })
    })
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ languages: fc.oneof(fc.nonEmptyString(), fc.constant('skip')) }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.languages()),
  ])(
    'when the form has been submitted but languages cannot be saved',
    async (oauth, publicUrl, connection, user, existingLanguages) => {
      const actual = await runMiddleware(
        _.changeLanguages({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteLanguages: () => TE.left('unavailable'),
          getLanguages: () => TE.fromEither(existingLanguages),
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
      body: fc.record({ languages: fc.constant('') }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])('when the form has been submitted without setting languages', async (oauth, publicUrl, connection, user) => {
    const deleteLanguages = jest.fn<EditLanguagesEnv['deleteLanguages']>(_ => TE.right(undefined))

    const actual = await runMiddleware(
      _.changeLanguages({
        getUser: () => M.right(user),
        publicUrl,
        oauth,
        deleteLanguages,
        getLanguages: shouldNotBeCalled,
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
    expect(deleteLanguages).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeLanguages({
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

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeLanguages({
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
