import { Cookies, FetchHttpClient, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Chunk, Duration, Effect, identity, Layer, pipe, Redacted, Stream, Struct, Tuple } from 'effect'
import fetchMock from 'fetch-mock'
import Keyv from 'keyv'
import { UnableToHandleCommand } from '../../../src/Commands.ts'
import { Locale, SessionStore } from '../../../src/Context.ts'
import { CookieSignature } from '../../../src/CookieSignature.ts'
import { OrcidOauth } from '../../../src/OrcidOauth.ts'
import { Prereviewers } from '../../../src/Prereviewers/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import { UnableToQuery } from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { SessionId, UserC } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/log-in/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

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
        HttpServerResponse.redirect(Routes.HomePage, {
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
          HttpServerResponse.redirect(Routes.HomePage, {
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
        HttpServerResponse.redirect(Routes.HomePage, {
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
  describe('the PREreviewer can be logged in', () => {
    test.prop([
      fc.string(),
      fc.url(),
      fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
      fc.supportedLocale(),
      fc.record({
        access_token: fc.string(),
        token_type: fc.string(),
        name: fc.string(),
        orcid: fc.orcidId(),
      }),
      fc.cookieName(),
      fc.uuid(),
      fc.string(),
    ])(
      'when the state contains a valid referer',
      (code, referer, orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId) =>
        Effect.gen(function* () {
          const sessionStore = new Keyv()

          const actual = yield* pipe(
            _.authenticate(code, referer.href),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* all(sessionStore.iterator!(undefined))

          expect(sessions).toStrictEqual([[sessionId, { user: { orcid: accessToken.orcid } }]])
          expect(actual).toStrictEqual(
            HttpServerResponse.redirect(referer.href, {
              status: StatusCodes.Found,
              cookies: Cookies.fromIterable([
                Cookies.unsafeMakeCookie(sessionCookie, signedSessionId, { httpOnly: true, path: '/' }),
              ]),
            }),
          )
        }).pipe(
          Effect.provide(Layer.mock(CookieSignature, { sign: () => signedSessionId })),
          Effect.provideService(FetchHttpClient.Fetch, (...args) =>
            fetchMock
              .createInstance()
              .postOnce(orcidOauth.tokenUrl.href, {
                status: StatusCodes.OK,
                body: accessToken,
              })
              .fetchHandler(...args),
          ),
          Effect.provide(Layer.mock(Prereviewers, { isRegistered: () => Effect.succeed(true) })),
          Effect.provideService(_.IsUserBlocked, () => false),
          Effect.provideService(Locale, locale),
          Effect.provideService(OrcidOauth, orcidOauth),
          Effect.provideService(PublicUrl, new URL('/', referer)),
          Effect.provide(Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(sessionId) })),
          EffectTest.run,
        ),
    )

    test.prop([
      fc.string(),
      fc.oneof(
        fc
          .tuple(fc.url(), fc.url())
          .filter(([publicUrl, state]) => publicUrl.origin !== state.origin)
          .map(([publicUrl, state]) => Tuple.make(publicUrl, state.href)),
        fc.tuple(fc.url(), fc.string()),
      ),
      fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
      fc.supportedLocale(),
      fc.record({
        access_token: fc.string(),
        token_type: fc.string(),
        name: fc.string(),
        orcid: fc.orcidId(),
      }),
      fc.cookieName(),
      fc.uuid(),
      fc.string(),
    ])(
      'when the state contains an invalid referer',
      (code, [publicUrl, state], orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId) =>
        Effect.gen(function* () {
          const sessionStore = new Keyv()

          const actual = yield* pipe(
            _.authenticate(code, state),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* all(sessionStore.iterator!(undefined))

          expect(sessions).toStrictEqual([[sessionId, { user: { orcid: accessToken.orcid } }]])
          expect(actual).toStrictEqual(
            HttpServerResponse.redirect(Routes.HomePage, {
              status: StatusCodes.Found,
              cookies: Cookies.fromIterable([
                Cookies.unsafeMakeCookie(sessionCookie, signedSessionId, { httpOnly: true, path: '/' }),
                Cookies.unsafeMakeCookie('flash-message', 'logged-in', { httpOnly: true, path: '/' }),
              ]),
            }),
          )
        }).pipe(
          Effect.provide(Layer.mock(CookieSignature, { sign: () => signedSessionId })),
          Effect.provideService(FetchHttpClient.Fetch, (...args) =>
            fetchMock
              .createInstance()
              .postOnce(orcidOauth.tokenUrl.href, { status: StatusCodes.OK, body: accessToken })
              .fetchHandler(...args),
          ),
          Effect.provide(Layer.mock(Prereviewers, { isRegistered: () => Effect.succeed(true) })),
          Effect.provideService(_.IsUserBlocked, () => false),
          Effect.provideService(Locale, locale),
          Effect.provideService(OrcidOauth, orcidOauth),
          Effect.provideService(PublicUrl, publicUrl),
          Effect.provide(Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(sessionId) })),
          EffectTest.run,
        ),
    )

    test.prop([
      fc.string(),
      fc.oneof(
        fc
          .tuple(fc.url(), fc.url())
          .filter(([publicUrl, state]) => publicUrl.origin !== state.origin)
          .map(([publicUrl, state]) => Tuple.make(publicUrl, state.href)),
        fc.tuple(fc.url(), fc.string()),
      ),
      fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
      fc.supportedLocale(),
      fc.record({
        access_token: fc.string(),
        token_type: fc.string(),
        name: fc.string(),
        orcid: fc.orcidId(),
      }),
      fc.cookieName(),
      fc.uuid(),
      fc.string(),
    ])(
      'when the PREreviewer has not been registered',
      (code, [publicUrl, state], orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId) => {
        const registerSpy = jest.fn<(typeof Prereviewers.Service)['legacyRegister']>(() => Effect.void)
        const importRegisteredOrcidIdSpy = jest.fn<(typeof Prereviewers.Service)['importRegisteredOrcidId']>(
          () => Effect.void,
        )

        return Effect.gen(function* () {
          yield* _.authenticate(code, state)

          expect(registerSpy).toHaveBeenCalled()
        }).pipe(
          Effect.provide([
            Layer.mock(CookieSignature, { sign: () => signedSessionId }),
            Layer.succeed(FetchHttpClient.Fetch, (...args) =>
              fetchMock
                .createInstance()
                .postOnce(orcidOauth.tokenUrl.href, { status: StatusCodes.OK, body: accessToken })
                .fetchHandler(...args),
            ),
            Layer.mock(Uuid.GenerateUuid, { v4: () => Effect.succeed(sessionId) }),
            Layer.succeed(_.IsUserBlocked, () => false),
            Layer.succeed(Locale, locale),
            Layer.succeed(OrcidOauth, orcidOauth),
            Layer.mock(Prereviewers, {
              isRegistered: () => Effect.succeed(false),
              legacyRegister: registerSpy,
              importRegisteredOrcidId: importRegisteredOrcidIdSpy,
            }),
            Layer.succeed(PublicUrl, publicUrl),
            Layer.succeed(SessionStore, { cookie: sessionCookie, store: new Keyv() }),
          ]),
          EffectTest.run,
        )
      },
    )
  })

  test.prop([
    fc.string(),
    fc.url(),
    fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
    fc.supportedLocale(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcidId(),
    }),
    fc.cookieName(),
  ])('when the user is blocked', (code, referer, orcidOauth, locale, accessToken, sessionCookie) =>
    Effect.gen(function* () {
      const sessionStore = new Keyv()
      const isUserBlocked = jest.fn<typeof _.IsUserBlocked.Service>(_ => true)

      const actual = yield* pipe(
        _.authenticate(code, referer.href),
        Effect.flip,
        Effect.provideService(_.IsUserBlocked, isUserBlocked),
        Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
      )

      const sessions = yield* all(sessionStore.iterator!(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: Routes.HomePage,
        message: 'blocked',
      })
      expect(isUserBlocked).toHaveBeenCalledWith(accessToken.orcid)
    }).pipe(
      Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled })),
      Effect.provideService(FetchHttpClient.Fetch, (...args) =>
        fetchMock
          .createInstance()
          .postOnce(orcidOauth.tokenUrl.href, {
            status: StatusCodes.OK,
            body: accessToken,
          })
          .fetchHandler(...args),
      ),
      Effect.provide(Layer.mock(Prereviewers, {})),
      Effect.provideService(Locale, locale),
      Effect.provideService(OrcidOauth, orcidOauth),
      Effect.provideService(PublicUrl, new URL('/', referer)),
      Effect.provide(Uuid.layer),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.string(),
    fc.url(),
    fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
    fc.supportedLocale(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcidId(),
    }),
    fc.cookieName(),
  ])('when the PREreviewer cannot be registered', (code, referer, orcidOauth, locale, accessToken, sessionCookie) =>
    Effect.gen(function* () {
      const sessionStore = new Keyv()
      const fetch = fetchMock.createInstance().postOnce(orcidOauth.tokenUrl.href, {
        status: StatusCodes.OK,
        body: accessToken,
      })

      const actual = yield* pipe(
        _.authenticate(code, referer.href),
        Effect.flip,
        Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
        Effect.provideService(FetchHttpClient.Fetch, (...args) => fetch.fetchHandler(...args)),
      )

      const sessions = yield* all(sessionStore.iterator!(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(fetch.callHistory.done()).toBeTruthy()
    }).pipe(
      Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled })),
      Effect.provide(
        Layer.mock(Prereviewers, {
          legacyRegister: () => new UnableToHandleCommand({}),
          isRegistered: () => Effect.succeed(false),
        }),
      ),
      Effect.provideService(_.IsUserBlocked, () => false),
      Effect.provideService(Locale, locale),
      Effect.provideService(OrcidOauth, orcidOauth),
      Effect.provideService(PublicUrl, new URL('/', referer)),
      Effect.provide(Uuid.layer),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.string(),
    fc.url(),
    fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
    fc.supportedLocale(),
    fc.record({
      access_token: fc.string(),
      token_type: fc.string(),
      name: fc.string(),
      orcid: fc.orcidId(),
    }),
    fc.cookieName(),
  ])(
    'when registration state for PREreviewer is not available',
    (code, referer, orcidOauth, locale, accessToken, sessionCookie) =>
      Effect.gen(function* () {
        const sessionStore = new Keyv()
        const fetch = fetchMock.createInstance().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        })

        const actual = yield* pipe(
          _.authenticate(code, referer.href),
          Effect.flip,
          Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          Effect.provideService(FetchHttpClient.Fetch, (...args) => fetch.fetchHandler(...args)),
        )

        const sessions = yield* all(sessionStore.iterator!(undefined))

        expect(sessions).toStrictEqual([])
        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(fetch.callHistory.done()).toBeTruthy()
      }).pipe(
        Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled })),
        Effect.provide(Layer.mock(Prereviewers, { isRegistered: () => new UnableToQuery({}) })),
        Effect.provideService(_.IsUserBlocked, () => false),
        Effect.provideService(Locale, locale),
        Effect.provideService(OrcidOauth, orcidOauth),
        Effect.provideService(PublicUrl, new URL('/', referer)),
        Effect.provide(Uuid.layer),
        EffectTest.run,
      ),
  )
})

describe('AuthenticateError', () => {
  test.prop([fc.supportedLocale()])('with an access_denied error', locale =>
    Effect.gen(function* () {
      const actual = yield* _.AuthenticateError({ error: 'access_denied' })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.Forbidden,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([fc.string(), fc.supportedLocale()])('with an unknown error', (error, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.AuthenticateError({ error })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )
})

function all<A>(iterable: AsyncIterable<A>): Effect.Effect<ReadonlyArray<A>, unknown> {
  return Stream.fromAsyncIterable(iterable, identity).pipe(Stream.runCollect, Effect.map(Chunk.toArray))
}
