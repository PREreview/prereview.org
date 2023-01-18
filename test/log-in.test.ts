import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import all from 'it-all'
import Keyv from 'keyv'
import * as _ from '../src/log-in'
import { writeReviewMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('log-in', () => {
  describe('logIn', () => {
    test.prop([
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
    ])('when there is a Referer header', async (oauth, [connection, referer]) => {
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
    })

    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.connection(),
    ])("when there isn't a Referer header", async (oauth, connection) => {
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
                state: '',
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
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
    fc.preprintDoi(),
    fc.origin(),
    fc.connection(),
  ])('logInAndRedirect', async (oauth, preprintDoi, publicUrl, connection) => {
    const actual = await runMiddleware(
      _.logInAndRedirect(writeReviewMatch.formatter, { doi: preprintDoi })({
        oauth,
        publicUrl,
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
              state: new URL(
                `/preprints/doi-${encodeURIComponent(
                  preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                )}/write-a-prereview`,
                publicUrl,
              ).toString(),
            }).toString()}`,
            oauth.authorizeUrl,
          ).href,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  describe('authenticate', () => {
    test.prop([
      fc.string(),
      fc.url().chain(url => fc.tuple(fc.constant(url))),
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
      fc.string(),
      fc.connection(),
    ])(
      'when the state contains a valid referer',
      async (code, [referer], oauth, accessToken, pseudonym, secret, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.authenticate(
            code,
            referer.href,
          )({
            clock: SystemClock,
            fetch: fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
              status: Status.OK,
              body: accessToken,
            }),
            getPseudonym: () => TE.right(pseudonym),
            logger: () => IO.of(undefined),
            oauth,
            publicUrl: new URL('/', referer),
            secret,
            sessionStore,
          }),
          connection,
        )()
        const sessions = await all(sessionStore.iterator(undefined))

        expect(sessions).toStrictEqual([
          [expect.anything(), { name: accessToken.name, orcid: accessToken.orcid, pseudonym }],
        ])
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.Found },
            { type: 'setHeader', name: 'Location', value: referer.href },
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
    )

    test.prop([
      fc.string(),
      fc.url().chain(url => fc.tuple(fc.constant(url))),
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
    ])('when a pseudonym cannot be found', async (code, [referer], oauth, accessToken, secret, connection) => {
      const sessionStore = new Keyv()

      const actual = await runMiddleware(
        _.authenticate(
          code,
          referer.href,
        )({
          clock: SystemClock,
          fetch: fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
            status: Status.OK,
            body: accessToken,
          }),
          getPseudonym: () => TE.left('no-pseudonym'),
          logger: () => IO.of(undefined),
          oauth,
          publicUrl: new URL('/', referer),
          secret,
          sessionStore,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Forbidden },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([
      fc.string(),
      fc.url().chain(url => fc.tuple(fc.constant(url))),
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
      fc.anything(),
      fc.string(),
      fc.connection(),
    ])(
      'when a pseudonym cannot be retrieved',
      async (code, [referer], oauth, accessToken, error, secret, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.authenticate(
            code,
            referer.href,
          )({
            clock: SystemClock,
            fetch: fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
              status: Status.OK,
              body: accessToken,
            }),
            getPseudonym: () => TE.left(error),
            logger: () => IO.of(undefined),
            oauth,
            publicUrl: new URL('/', referer),
            secret,
            sessionStore,
          }),
          connection,
        )()
        const sessions = await all(sessionStore.iterator(undefined))

        expect(sessions).toStrictEqual([])
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
      fc.string(),
      fc.url(),
      fc.oneof(fc.webUrl(), fc.string()),
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
      fc.string(),
      fc.connection(),
    ])(
      'when the state contains an invalid referer',
      async (code, publicUrl, state, oauth, accessToken, pseudonym, secret, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.authenticate(
            code,
            state,
          )({
            clock: SystemClock,
            fetch: fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
              status: Status.OK,
              body: accessToken,
            }),
            getPseudonym: () => TE.right(pseudonym),
            logger: () => IO.of(undefined),
            oauth,
            publicUrl,
            secret,
            sessionStore,
          }),
          connection,
        )()
        const sessions = await all(sessionStore.iterator(undefined))

        expect(sessions).toStrictEqual([
          [expect.anything(), { name: accessToken.name, orcid: accessToken.orcid, pseudonym }],
        ])
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.Found },
            { type: 'setHeader', name: 'Location', value: '/' },
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
    )
  })

  describe('authenticateError', () => {
    test.prop([fc.connection()])('with an access_denied error', async connection => {
      const actual = await runMiddleware(_.authenticateError('access_denied')({}), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Forbidden },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([fc.string(), fc.connection()])('with an unknown error', async (error, connection) => {
      const actual = await runMiddleware(_.authenticateError(error)({}), connection)()

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
})
