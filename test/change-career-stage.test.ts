import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/change-career-stage'
import { myDetailsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('changeCareerStage', () => {
  describe('when profiles can be edited', () => {
    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.user(),
    ])('when there is a logged in user', async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeCareerStage({ canEditProfile: true, getUser: () => M.fromEither(E.right(user)), publicUrl, oauth }),
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
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.connection({ method: fc.constant('POST') }),
      fc.user(),
    ])('when the form has been submitted', async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeCareerStage({ canEditProfile: true, getUser: () => M.right(user), publicUrl, oauth }),
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
    })

    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.connection(),
    ])('when the user is not logged in', async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeCareerStage({
          canEditProfile: true,
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
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
    })

    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.error(),
    ])("when the user can't be loaded", async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeCareerStage({
          canEditProfile: true,
          getUser: () => M.left(error),
          oauth,
          publicUrl,
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
    })
  })

  test.prop([
    fc.record({
      authorizeUrl: fc.url(),
      clientId: fc.string(),
      clientSecret: fc.string(),
      redirectUri: fc.url(),
      tokenUrl: fc.url(),
    }),
    fc.origin(),
    fc.connection(),
    fc.either(fc.oneof(fc.error(), fc.constant('no-session' as const)), fc.user()),
  ])("when profiles can't be edited", async (oauth, publicUrl, connection, user) => {
    const actual = await runMiddleware(
      _.changeCareerStage({ canEditProfile: false, getUser: () => M.fromEither(user), publicUrl, oauth }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
