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
    test('when the user can be decoded', () => {
      fc.assert(
        fc.property(fc.user(), user => {
          const actual = pipe(user, _.UserC.encode, _.UserC.decode)

          expect(actual).toStrictEqual(D.success(user))
        }),
      )
    })

    test('when the user cannot be decoded', () => {
      fc.assert(
        fc.property(fc.string(), string => {
          const actual = _.UserC.decode(string)

          expect(actual).toStrictEqual(E.left(expect.anything()))
        }),
      )
    })
  })

  test('storeUserInSession', async () => {
    await fc.assert(
      fc.asyncProperty(fc.user(), fc.string(), fc.connection<HeadersOpen>(), async (user, secret, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.storeUserInSession(user)({
            secret,
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
              name: 'session',
              options: expect.anything(),
              value: expect.stringMatching(new RegExp(`^${sessions[0][0]}\\.`)),
            },
          ]),
        )
      }),
    )
  })

  describe('getUserFromSession', () => {
    test('when the user can be decoded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.user(),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
              }),
              fc.constant(sessionId),
              fc.constant(secret),
            ),
          ),
          async (user, [connection, sessionId, secret]) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, _.UserC.encode(user))

            const actual = await M.evalMiddleware(
              _.getUserFromSession()({
                secret,
                sessionStore,
              }),
              connection,
            )()

            expect(actual).toStrictEqual(E.right(user))
          },
        ),
      )
    })

    test('when the user cannot be decoded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.user(),
          fc.jsonValue(),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
              }),
              fc.constant(sessionId),
              fc.constant(secret),
            ),
          ),
          async (user, value, [connection, sessionId, secret]) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, value)

            const actual = await M.evalMiddleware(
              _.getUserFromSession()({
                secret,
                sessionStore,
              }),
              connection,
            )()

            expect(actual).toStrictEqual(E.left(expect.anything()))
          },
        ),
      )
    })

    test('when there is no session', async () => {
      await fc.assert(
        fc.asyncProperty(fc.user(), fc.string(), fc.connection(), async (user, secret, connection) => {
          const sessionStore = new Keyv()

          const actual = await M.evalMiddleware(
            _.getUserFromSession()({
              secret,
              sessionStore,
            }),
            connection,
          )()

          expect(actual).toStrictEqual(E.left('no-session'))
        }),
      )
    })
  })
})
