import { Cookies, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import { Chunk, Duration, Effect, identity, pipe, Stream } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType } from 'hyper-ts'
import Keyv from 'keyv'
import { SessionStore } from '../../src/Context.ts'
import * as _ from '../../src/log-in/index.ts'
import * as Routes from '../../src/routes.ts'
import { homeMatch } from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { SessionId, UserC } from '../../src/user.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'
import { runMiddleware } from '../middleware.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

test('logIn', () => {
  const actual = _.logIn

  expect(actual).toStrictEqual({
    _tag: 'LogInResponse',
    location: '/',
  })
})

describe('LogOut', () => {
  test.prop([fc.uuid(), fc.cookieName(), fc.user()])('when there is a session', (cookie, sessionId, user) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.tryPromise(() => store.set(sessionId, { user: UserC.encode(user) }))

      const actual = yield* pipe(
        _.LogOut,
        Effect.provideService(SessionId, sessionId),
        Effect.provideService(SessionStore, { cookie, store }),
      )

      expect(yield* Effect.tryPromise(() => store.has(sessionId))).toBeFalsy()
      expect(actual).toStrictEqual(
        HttpServerResponse.redirect(format(Routes.homeMatch.formatter, {}), {
          status: StatusCodes.SeeOther,
          cookies: Cookies.fromIterable([
            Cookies.unsafeMakeCookie('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
            Cookies.unsafeMakeCookie(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
          ]),
        }),
      )
    }).pipe(EffectTest.run),
  )

  test.prop([fc.uuid(), fc.cookieName(), fc.user(), fc.anything()])(
    "when the session can't be removed",
    (cookie, sessionId, user, error) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.tryPromise(() => store.set(sessionId, { user: UserC.encode(user) }))
        store.delete = () => Promise.reject(error)

        const actual = yield* pipe(
          _.LogOut,
          Effect.provideService(SessionId, sessionId),
          Effect.provideService(SessionStore, { cookie, store }),
        )

        expect(yield* Effect.tryPromise(() => store.has(sessionId))).toBeTruthy()
        expect(actual).toStrictEqual(
          HttpServerResponse.redirect(format(Routes.homeMatch.formatter, {}), {
            status: StatusCodes.SeeOther,
            cookies: Cookies.fromIterable([
              Cookies.unsafeMakeCookie('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
              Cookies.unsafeMakeCookie(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
            ]),
          }),
        )
      }).pipe(EffectTest.run),
  )

  test.prop([fc.cookieName()])("when there isn't a session", cookie =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* pipe(_.LogOut, Effect.provideService(SessionStore, { cookie, store }))

      expect(actual).toStrictEqual(
        HttpServerResponse.redirect(format(Routes.homeMatch.formatter, {}), {
          status: StatusCodes.SeeOther,
          cookies: Cookies.fromIterable([
            Cookies.unsafeMakeCookie('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
            Cookies.unsafeMakeCookie(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
          ]),
        }),
      )
    }).pipe(EffectTest.run),
  )
})

describe('authenticate', () => {
  describe('when the state contains a valid referer', () => {
    test.prop([
      fc.string(),
      fc.url().chain(url => fc.tuple(fc.constant(url))),
      fc.oauth(),
      fc.supportedLocale(),
      fc.record({
        access_token: fc.string(),
        token_type: fc.string(),
        name: fc.nonEmptyString(),
        orcid: fc.orcidId(),
      }),
      fc.pseudonym(),
      fc.string(),
      fc.cookieName(),
      fc.connection(),
    ])(
      'when there is a name',
      async (code, [referer], orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.authenticate(
            code,
            referer.href,
          )({
            clock: SystemClock,
            fetch: fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
              status: StatusCodes.OK,
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
            { type: 'setStatus', status: StatusCodes.Found },
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
        name: fc.string({ unit: fc.whiteSpaceCharacter() }),
        orcid: fc.orcidId(),
      }),
      fc.pseudonym(),
      fc.string(),
      fc.cookieName(),
      fc.connection(),
    ])(
      "when there isn't a name",
      async (code, [referer], orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(
          _.authenticate(
            code,
            referer.href,
          )({
            clock: SystemClock,
            fetch: fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
              status: StatusCodes.OK,
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
          [
            expect.anything(),
            { user: { name: `PREreviewer ${accessToken.orcid}`, orcid: accessToken.orcid, pseudonym } },
          ],
        ])
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: StatusCodes.Found },
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
  })

  test.prop([
    fc.string(),
    fc.url().chain(url => fc.tuple(fc.constant(url))),
    fc.oauth(),
    fc.supportedLocale(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcidId(),
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
            status: StatusCodes.OK,
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
          { type: 'setStatus', status: StatusCodes.Found },
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
      orcid: fc.orcidId(),
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
        status: StatusCodes.OK,
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
          { type: 'setStatus', status: StatusCodes.ServiceUnavailable },
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
      orcid: fc.orcidId(),
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
            status: StatusCodes.OK,
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
        [expect.anything(), { user: { name: expect.anything(), orcid: accessToken.orcid, pseudonym } }],
      ])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: StatusCodes.Found },
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
  test.prop([fc.supportedLocale()])('with an access_denied error', locale => {
    const actual = _.authenticateError({ error: 'access_denied', locale })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.Forbidden,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.string(), fc.supportedLocale()])('with an unknown error', (error, locale) => {
    const actual = _.authenticateError({ error, locale })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})

function all<A>(iterable: AsyncIterable<A>): Promise<ReadonlyArray<A>> {
  return Stream.fromAsyncIterable(iterable, identity).pipe(
    Stream.runCollect,
    Effect.map(Chunk.toArray),
    Effect.runPromise,
  )
}
