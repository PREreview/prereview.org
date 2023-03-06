import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { HeadersOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as D from 'io-ts/Decoder'
import all from 'it-all'
import Keyv from 'keyv'
import * as _ from '../src/user'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('user', () => {
  describe('UserC', () => {
    test.prop([fc.user()])('when the user can be decoded', user => {
      const actual = pipe(user, _.UserC.encode, _.UserC.decode)

      expect(actual).toStrictEqual(D.success(user))
    })

    test.prop([fc.string()])('when the user cannot be decoded', string => {
      const actual = _.UserC.decode(string)

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })
  })

  test.prop([fc.user(), fc.string(), fc.cookieName(), fc.connection<HeadersOpen>()])(
    'storeUserInSession',
    async (user, secret, sessionCookie, connection) => {
      const sessionStore = new Keyv()

      const actual = await runMiddleware(
        _.storeUserInSession(user)({
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([[expect.anything(), user]])
      expect(actual).toStrictEqual(
        E.right([
          {
            type: 'setCookie',
            name: sessionCookie,
            options: expect.anything(),
            value: expect.stringMatching(new RegExp(`^${sessions[0][0]}\\.`)),
          },
        ]),
      )
    },
  )

  describe('getUserFromSession', () => {
    test.prop([
      fc.user(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.tuple(
          fc.connection({
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          }),
          fc.constant(sessionCookie),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    ])('when the user can be decoded', async (user, [connection, sessionCookie, sessionId, secret]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, _.UserC.encode(user))

      const actual = await M.evalMiddleware(
        _.getUserFromSession()({
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(E.right(user))
    })

    test.prop([
      fc.user(),
      fc.jsonValue(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.tuple(
          fc.connection({
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          }),
          fc.constant(sessionCookie),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    ])('when the user cannot be decoded', async (user, value, [connection, sessionCookie, sessionId, secret]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, value)

      const actual = await M.evalMiddleware(
        _.getUserFromSession()({
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    })

    test.prop([fc.user(), fc.string(), fc.cookieName(), fc.connection()])(
      'when there is no session',
      async (user, secret, sessionCookie, connection) => {
        const sessionStore = new Keyv()

        const actual = await M.evalMiddleware(
          _.getUserFromSession()({
            secret,
            sessionCookie,
            sessionStore,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(E.left('no-session'))
      },
    )
  })
})
