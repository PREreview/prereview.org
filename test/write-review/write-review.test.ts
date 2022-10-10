import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test('there is completed form already', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                method: fc.requestMethod().filter(method => method !== 'POST'),
              }),
              fc.constant(sessionId),
              fc.constant(secret),
            ),
          ),
          fc.record({
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            otherAuthors: fc.array(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.lorem(),
          }),
          fc.user(),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
              TE.right(preprintTitle),
            )

            const actual = await runMiddleware(
              _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: `/preprints/doi-${encodeURIComponent(
                    preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                  )}/write-a-prereview/check-your-prereview`,
                },
                { type: 'endResponse' },
              ]),
            )
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
          },
        ),
      )
    })

    test("there isn't a form", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                method: fc.requestMethod().filter(method => method !== 'POST'),
              }),
              fc.constant(sessionId),
              fc.constant(secret),
            ),
          ),
          fc.user(),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: `/preprints/doi-${encodeURIComponent(
                    preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                  )}/write-a-prereview/write-your-prereview`,
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })
  })

  test("when there isn't a session", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.connection({
          headers: fc.constant({}),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
        fc.string(),
        async (preprintDoi, preprintTitle, connection, secret) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.OK },
              { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
              { type: 'setBody', body: expect.anything() },
            ]),
          )
        },
      ),
    )
  })

  test('when the preprint cannot be loaded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.connection({
          headers: fc.constant({}),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
        fc.string(),
        async (preprintDoi, connection, secret) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.left('unavailable' as const)

          const actual = await runMiddleware(
            _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
      ),
    )
  })

  test('when the preprint is not found', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.connection({
          headers: fc.constant({}),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
        fc.string(),
        async (preprintDoi, connection, secret) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.left('not-found' as const)

          const actual = await runMiddleware(
            _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
        },
      ),
    )
  })
})
