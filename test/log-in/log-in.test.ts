import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import cookieSignature from 'cookie-signature'
import { Chunk, Effect, identity, Stream } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import * as _ from '../../src/log-in/index.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { homeMatch, writeReviewMatch } from '../../src/routes.js'
import { OrcidLocale } from '../../src/types/index.js'
import { UserC } from '../../src/user.js'
import * as fc from '../fc.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('logIn', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.supportedLocale(),
    fc
      .webUrl()
      .chain(referer => fc.tuple(fc.connection({ headers: fc.constant({ Referer: referer }) }), fc.constant(referer))),
  ])('when there is a Referer header', async (orcidOauth, publicUrl, locale, [connection, referer]) => {
    const actual = await runMiddleware(_.logIn({ locale, orcidOauth, publicUrl }), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.Found },
        {
          type: 'setHeader',
          name: 'Location',
          value: new URL(
            `?${new URLSearchParams({
              lang: OrcidLocale.fromSupportedLocale(locale),
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

  test.prop([fc.oauth(), fc.origin(), fc.supportedLocale(), fc.connection()])(
    "when there isn't a Referer header",
    async (orcidOauth, publicUrl, locale, connection) => {
      const actual = await runMiddleware(_.logIn({ locale, orcidOauth, publicUrl }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                lang: OrcidLocale.fromSupportedLocale(locale),
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

test.prop([fc.oauth(), fc.preprintId(), fc.supportedLocale(), fc.origin(), fc.connection()])(
  'logInAndRedirect',
  async (orcidOauth, preprintId, locale, publicUrl, connection) => {
    const actual = await runMiddleware(
      _.logInAndRedirect(writeReviewMatch.formatter, { id: preprintId })({
        locale,
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
              lang: OrcidLocale.fromSupportedLocale(locale),
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
    fc.supportedLocale(),
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
    async (code, [referer], orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, connection) => {
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
          locale,
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
      const sessions = await all(sessionStore.iterator!(undefined))

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
    fc.supportedLocale(),
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
    async (code, [referer], orcidOauth, locale, accessToken, secret, sessionCookie, connection) => {
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
          locale,
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

      const sessions = await all(sessionStore.iterator!(undefined))

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
    fc.supportedLocale(),
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
    async (code, [referer], orcidOauth, locale, accessToken, secret, sessionCookie, connection, page) => {
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
          locale,
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
      const sessions = await all(sessionStore.iterator!(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
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
    fc.supportedLocale(),
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
    async (code, publicUrl, state, orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, connection) => {
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
          locale,
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
      const sessions = await all(sessionStore.iterator!(undefined))

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
  test.prop([fc.connection(), fc.supportedLocale(), fc.html()])(
    'with an access_denied error',
    async (connection, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.authenticateError({ error: 'access_denied', locale })({
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Forbidden },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main']],
        js: [],
        locale,
      })
    },
  )

  test.prop([fc.string(), fc.connection(), fc.supportedLocale(), fc.html()])(
    'with an unknown error',
    async (error, connection, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.authenticateError({ error, locale })({
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main']],
        js: [],
        locale,
      })
    },
  )
})

function all<A>(iterable: AsyncIterable<A>): Promise<ReadonlyArray<A>> {
  return Stream.fromAsyncIterable(iterable, identity).pipe(
    Stream.runCollect,
    Effect.map(Chunk.toArray),
    Effect.runPromise,
  )
}
