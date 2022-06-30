import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import all from 'it-all'
import Keyv from 'keyv'
import * as _ from '../src/log-in'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('log-in', () => {
  describe('logIn', () => {
    test('when there is a Referer header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            authorizeUrl: fc.url(),
            clientId: fc.string(),
            clientSecret: fc.string(),
            redirectUri: fc.url(),
            tokenUrl: fc.url(),
          }),
          fc
            .webUrl()
            .chain(referer =>
              fc.tuple(fc.connection({ headers: fc.constant({ Referer: referer }) }), fc.constant(referer)),
            ),
          async (oauth, [connection, referer]) => {
            const actual = await runMiddleware(_.logIn({ oauth }), connection)()

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
                      state: referer,
                    }).toString()}`,
                    oauth.authorizeUrl,
                  ).href,
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test("when there isn't a Referer header", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            authorizeUrl: fc.url(),
            clientId: fc.string(),
            clientSecret: fc.string(),
            redirectUri: fc.url(),
            tokenUrl: fc.url(),
          }),
          fc.connection(),
          async (oauth, connection) => {
            const actual = await runMiddleware(_.logIn({ oauth }), connection)()

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
                    }).toString()}`,
                    oauth.authorizeUrl,
                  ).href,
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })
  })

  test('authenticate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.record({
          authorizeUrl: fc.url(),
          clientId: fc.string(),
          clientSecret: fc.string(),
          redirectUri: fc.url(),
          tokenUrl: fc.url(),
        }),
        fc.record({
          access_token: fc.string(),
          token_type: fc.string(),
          name: fc.string(),
          orcid: fc.orcid(),
        }),
        fc.string(),
        fc.connection(),
        async (code, oauth, accessToken, secret, connection) => {
          const sessionStore = new Keyv()

          const actual = await runMiddleware(
            _.authenticate(code)({
              fetch: fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
                status: Status.OK,
                body: accessToken,
              }),
              oauth,
              secret,
              sessionStore,
            }),
            connection,
          )()
          const sessions = await all(sessionStore.iterator(undefined))

          expect(sessions).toStrictEqual([[expect.anything(), { name: accessToken.name, orcid: accessToken.orcid }]])
          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.Found },
              { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
              {
                type: 'setCookie',
                name: 'session',
                options: expect.anything(),
                value: expect.stringMatching(new RegExp(`^${sessions[0][0]}\\.`)),
              },
              { type: 'endResponse' },
            ]),
          )
        },
      ),
    )
  })
})
