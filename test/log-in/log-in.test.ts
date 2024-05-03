import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import cookieSignature from 'cookie-signature'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import all from 'it-all'
import Keyv from 'keyv'
import { rawHtml } from '../../src/html'
import * as _ from '../../src/log-in'
import type { TemplatePageEnv } from '../../src/page'
import { homeMatch, writeReviewMatch } from '../../src/routes'
import { UserC } from '../../src/user'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('logIn', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc
      .webUrl()
      .chain(referer => fc.tuple(fc.connection({ headers: fc.constant({ Referer: referer }) }), fc.constant(referer))),
  ])('when there is a Referer header', async (orcidOauth, publicUrl, [connection, referer]) => {
    const actual = await runMiddleware(_.logIn({ orcidOauth, publicUrl }), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Found },
        {
          type: 'setHeader',
          name: 'Location',
          value: new URL(
            `?${new URLSearchParams({
              client_id: orcidOauth.clientId,
              response_type: 'code',
              redirect_uri: new URL('/orcid', publicUrl).toString(),
              scope: '/authenticate',
              state: referer,
            }).toString()}`,
            orcidOauth.authorizeUrl,
          ).href,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    "when there isn't a Referer header",
    async (orcidOauth, publicUrl, connection) => {
      const actual = await runMiddleware(_.logIn({ orcidOauth, publicUrl }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: orcidOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL('/orcid', publicUrl).toString(),
                scope: '/authenticate',
                state: '',
              }).toString()}`,
              orcidOauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

test.prop([fc.oauth(), fc.preprintId(), fc.origin(), fc.connection()])(
  'logInAndRedirect',
  async (orcidOauth, preprintId, publicUrl, connection) => {
    const actual = await runMiddleware(
      _.logInAndRedirect(writeReviewMatch.formatter, { id: preprintId })({
        orcidOauth,
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
              client_id: orcidOauth.clientId,
              response_type: 'code',
              redirect_uri: new URL('/orcid', publicUrl).toString(),
              scope: '/authenticate',
              state: new URL(format(writeReviewMatch.formatter, { id: preprintId }), publicUrl).toString(),
            }).toString()}`,
            orcidOauth.authorizeUrl,
          ).href,
        },
        { type: 'endResponse' },
      ]),
    )
  },
)

describe('logOut', () => {
  test.prop([
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
    fc.user(),
  ])('when there is a session', async ([connection, sessionCookie, sessionId, secret], user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, { user: UserC.encode(user) })

    const actual = await runMiddleware(_.logOut({ secret, sessionCookie, sessionStore }), connection)()

    expect(await sessionStore.has(sessionId)).toBeFalsy()
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Found },
        { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
        { type: 'clearCookie', name: sessionCookie, options: expect.anything() },
        { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'logged-out' },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.connection(), fc.cookieName(), fc.string()])(
    "when there isn't a session",
    async (connection, sessionCookie, secret) => {
      const sessionStore = new Keyv()

      const actual = await runMiddleware(_.logOut({ secret, sessionCookie, sessionStore }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'logged-out' },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

describe('authenticate', () => {
  test.prop([
    fc.string(),
    fc.url().chain(url => fc.tuple(fc.constant(url))),
    fc.oauth(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcid(),
    }),
    fc.pseudonym(),
    fc.string(),
    fc.cookieName(),
    fc.connection(),
  ])(
    'when the state contains a valid referer',
    async (code, [referer], orcidOauth, accessToken, pseudonym, secret, sessionCookie, connection) => {
      const sessionStore = new Keyv()

      const actual = await runMiddleware(
        _.authenticate(
          code,
          referer.href,
        )({
          clock: SystemClock,
          fetch: fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
            status: Status.OK,
            body: accessToken,
          }),
          getPseudonym: () => TE.right(pseudonym),
          getUserOnboarding: shouldNotBeCalled,
          isUserBlocked: () => false,
          logger: () => IO.of(undefined),
          orcidOauth,
          publicUrl: new URL('/', referer),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([
        [expect.anything(), { user: { name: accessToken.name, orcid: accessToken.orcid, pseudonym } }],
      ])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: referer.href },
          {
            type: 'setCookie',
            name: sessionCookie,
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
    fc.oauth(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcid(),
    }),
    fc.string(),
    fc.cookieName(),
    fc.connection(),
  ])(
    'when the user is blocked',
    async (code, [referer], orcidOauth, accessToken, secret, sessionCookie, connection) => {
      const sessionStore = new Keyv()
      const isUserBlocked = jest.fn<_.IsUserBlockedEnv['isUserBlocked']>(_ => true)

      const actual = await runMiddleware(
        _.authenticate(
          code,
          referer.href,
        )({
          clock: SystemClock,
          fetch: fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
            status: Status.OK,
            body: accessToken,
          }),
          getPseudonym: shouldNotBeCalled,
          getUserOnboarding: shouldNotBeCalled,
          isUserBlocked,
          logger: () => IO.of(undefined),
          orcidOauth,
          publicUrl: new URL('/', referer),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'blocked' },
          { type: 'endResponse' },
        ]),
      )
      expect(isUserBlocked).toHaveBeenCalledWith(accessToken.orcid)
    },
  )

  test.prop([
    fc.string(),
    fc.url().chain(url => fc.tuple(fc.constant(url))),
    fc.oauth(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcid(),
    }),
    fc.string(),
    fc.cookieName(),
    fc.connection(),
    fc.html(),
  ])(
    'when a pseudonym cannot be retrieved',
    async (code, [referer], orcidOauth, accessToken, secret, sessionCookie, connection, page) => {
      const sessionStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
        status: Status.OK,
        body: accessToken,
      })

      const actual = await runMiddleware(
        _.authenticate(
          code,
          referer.href,
        )({
          clock: SystemClock,
          fetch,
          getPseudonym: () => TE.left('unavailable'),
          getUserOnboarding: shouldNotBeCalled,
          isUserBlocked: () => false,
          logger: () => IO.of(undefined),
          orcidOauth,
          publicUrl: new URL('/', referer),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: () => page,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Vary', value: 'Cookie' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.url(),
    fc.oneof(fc.webUrl(), fc.string()),
    fc.oauth(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcid(),
    }),
    fc.pseudonym(),
    fc.string(),
    fc.cookieName(),
    fc.connection(),
  ])(
    'when the state contains an invalid referer',
    async (code, publicUrl, state, orcidOauth, accessToken, pseudonym, secret, sessionCookie, connection) => {
      const sessionStore = new Keyv()

      const actual = await runMiddleware(
        _.authenticate(
          code,
          state,
        )({
          clock: SystemClock,
          fetch: fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
            status: Status.OK,
            body: accessToken,
          }),
          getPseudonym: () => TE.right(pseudonym),
          getUserOnboarding: shouldNotBeCalled,
          isUserBlocked: () => false,
          logger: () => IO.of(undefined),
          orcidOauth,
          publicUrl,
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()
      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([
        [expect.anything(), { user: { name: accessToken.name, orcid: accessToken.orcid, pseudonym } }],
      ])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
          {
            type: 'setCookie',
            name: sessionCookie,
            options: expect.anything(),
            value: expect.stringMatching(new RegExp(`^${sessions[0][0]}\\.`)),
          },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'logged-in' },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

describe('authenticateError', () => {
  test.prop([fc.connection(), fc.html()])('with an access_denied error', async (connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.authenticateError('access_denied')({
        getUserOnboarding: shouldNotBeCalled,
        templatePage,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Forbidden },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Vary', value: 'Cookie' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: page.toString() },
      ]),
    )
    expect(templatePage).toHaveBeenCalledWith({
      title: expect.stringContaining('Sorry'),
      content: expect.stringContaining('denied'),
      skipLinks: [[rawHtml('Skip to main content'), '#main']],
      js: [],
    })
  })

  test.prop([fc.string(), fc.connection(), fc.html()])('with an unknown error', async (error, connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.authenticateError(error)({
        getUserOnboarding: shouldNotBeCalled,
        templatePage,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Vary', value: 'Cookie' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: page.toString() },
      ]),
    )
    expect(templatePage).toHaveBeenCalledWith({
      title: expect.stringContaining('Sorry'),
      content: expect.stringContaining('unable'),
      skipLinks: [[rawHtml('Skip to main content'), '#main']],
      js: [],
    })
  })
})
