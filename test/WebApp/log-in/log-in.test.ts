import { Cookies, FetchHttpClient, HttpServerResponse } from 'effect/http'
import { describe, expect, it, test, vi } from '../../vitest.ts'
import { Duration, Effect, Layer, pipe, Redacted, Struct, Tuple } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import fetchMock from 'fetch-mock'
import { UnableToHandleCommand } from '../../../src/Commands.ts'
import { Locale, SessionStore } from '../../../src/Context.ts'
import { CookieSignature } from '../../../src/CookieSignature.ts'
import { OrcidOauth } from '../../../src/OrcidOauth.ts'
import { Prereviewers } from '../../../src/Prereviewers/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import { UnableToQuery } from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import { fromKeyValueStore } from '../../../src/SessionStore.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { SessionId, UserC } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/log-in/index.ts'
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
  it.effect.prop('when there is a session', [fc.uuid(), fc.cookieName(), fc.user()], ([cookie, sessionId, user]) =>
    Effect.gen(function* () {
      const keyValueStore = yield* KeyValueStore.KeyValueStore
      const store = fromKeyValueStore(keyValueStore)
      yield* store.set(sessionId, { user: UserC.encode(user) })

      const actual = yield* pipe(
        _.LogOut,
        Effect.provideService(SessionId, sessionId),
        Effect.provideService(SessionStore, { cookie, store }),
      )

      expect(yield* keyValueStore.has(sessionId)).toBeFalsy()
      expect(actual).toStrictEqual(
        HttpServerResponse.redirect(Routes.HomePage, {
          status: StatusCodes.SeeOther,
          cookies: Cookies.fromIterable([
            Cookies.makeCookieUnsafe('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
            Cookies.makeCookieUnsafe(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
          ]),
        }),
      )
    }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )

  it.effect.prop(
    "when the session can't be removed",
    [fc.uuid(), fc.cookieName(), fc.user(), fc.anything()],
    ([cookie, sessionId, user, error]) =>
      Effect.gen(function* () {
        const keyValueStore = yield* KeyValueStore.KeyValueStore
        const store = fromKeyValueStore(keyValueStore)
        yield* store.set(sessionId, { user: UserC.encode(user) })

        const actual = yield* pipe(
          _.LogOut,
          Effect.provideService(SessionId, sessionId),
          Effect.provideService(SessionStore, {
            cookie,
            store: {
              ...store,
              delete: () =>
                Effect.fail(
                  new KeyValueStore.KeyValueStoreError({ message: 'Unavailable', method: 'delete', cause: error }),
                ),
            },
          }),
        )

        expect(yield* keyValueStore.has(sessionId)).toBeTruthy()
        expect(actual).toStrictEqual(
          HttpServerResponse.redirect(Routes.HomePage, {
            status: StatusCodes.SeeOther,
            cookies: Cookies.fromIterable([
              Cookies.makeCookieUnsafe('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
              Cookies.makeCookieUnsafe(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
            ]),
          }),
        )
      }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )

  it.effect.prop("when there isn't a session", [fc.cookieName()], ([cookie]) =>
    Effect.gen(function* () {
      const store = fromKeyValueStore(yield* KeyValueStore.KeyValueStore)

      const actual = yield* pipe(_.LogOut, Effect.provideService(SessionStore, { cookie, store }))

      expect(actual).toStrictEqual(
        HttpServerResponse.redirect(Routes.HomePage, {
          status: StatusCodes.SeeOther,
          cookies: Cookies.fromIterable([
            Cookies.makeCookieUnsafe('flash-message', 'logged-out', { httpOnly: true, path: '/' }),
            Cookies.makeCookieUnsafe(cookie, '', { httpOnly: true, maxAge: Duration.zero, path: '/' }),
          ]),
        }),
      )
    }).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )
})

describe('authenticate', () => {
  describe('the PREreviewer can be logged in', () => {
    it.effect.prop(
      'when the state contains a valid referer',
      [
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
      ],
      ([code, referer, orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId]) =>
        Effect.gen(function* () {
          const keyValueStore = yield* KeyValueStore.KeyValueStore
          const sessionStore = fromKeyValueStore(keyValueStore)

          const actual = yield* pipe(
            _.authenticate(code, referer.href),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* allSessions(keyValueStore)

          expect(sessions).toStrictEqual([[sessionId, { user: { orcid: accessToken.orcid } }]])
          expect(actual).toStrictEqual(
            HttpServerResponse.redirect(referer.href, {
              status: StatusCodes.Found,
              cookies: Cookies.fromIterable([
                Cookies.makeCookieUnsafe(sessionCookie, signedSessionId, { httpOnly: true, path: '/' }),
              ]),
            }),
          )
        }).pipe(
          Effect.provide(Layer.mock(CookieSignature, { sign: () => signedSessionId, unsign: shouldNotBeCalled })),
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
          Effect.provide(KeyValueStore.layerMemory),
        ),
    )

    it.effect.prop(
      'when the state contains an invalid referer',
      [
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
      ],
      ([code, [publicUrl, state], orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId]) =>
        Effect.gen(function* () {
          const keyValueStore = yield* KeyValueStore.KeyValueStore
          const sessionStore = fromKeyValueStore(keyValueStore)

          const actual = yield* pipe(
            _.authenticate(code, state),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* allSessions(keyValueStore)

          expect(sessions).toStrictEqual([[sessionId, { user: { orcid: accessToken.orcid } }]])
          expect(actual).toStrictEqual(
            HttpServerResponse.redirect(Routes.HomePage, {
              status: StatusCodes.Found,
              cookies: Cookies.fromIterable([
                Cookies.makeCookieUnsafe(sessionCookie, signedSessionId, { httpOnly: true, path: '/' }),
                Cookies.makeCookieUnsafe('flash-message', 'logged-in', { httpOnly: true, path: '/' }),
              ]),
            }),
          )
        }).pipe(
          Effect.provide(Layer.mock(CookieSignature, { sign: () => signedSessionId, unsign: shouldNotBeCalled })),
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
          Effect.provide(KeyValueStore.layerMemory),
        ),
    )

    it.effect.prop(
      'when the PREreviewer has not been registered',
      [
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
      ],
      ([code, [publicUrl, state], orcidOauth, locale, accessToken, sessionCookie, sessionId, signedSessionId]) => {
        const registerSpy = vi.fn<(typeof Prereviewers.Service)['register']>(() => Effect.void)

        return Effect.gen(function* () {
          yield* _.authenticate(code, state)

          expect(registerSpy).toHaveBeenCalled()
        }).pipe(
          Effect.provide([
            Layer.mock(CookieSignature, { sign: () => signedSessionId, unsign: shouldNotBeCalled }),
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
              register: registerSpy,
            }),
            Layer.succeed(PublicUrl, publicUrl),
            Layer.effect(
              SessionStore,
              Effect.gen(function* () {
                return { cookie: sessionCookie, store: fromKeyValueStore(yield* KeyValueStore.KeyValueStore) }
              }),
            ).pipe(Layer.provide(KeyValueStore.layerMemory)),
          ]),
        )
      },
    )
  })

  it.effect.prop(
    'when the user is blocked',
    [
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
    ],
    ([code, referer, orcidOauth, locale, accessToken, sessionCookie]) =>
      Effect.gen(function* () {
        const keyValueStore = yield* KeyValueStore.KeyValueStore
        const sessionStore = fromKeyValueStore(keyValueStore)
        const isUserBlocked = vi.fn<typeof _.IsUserBlocked.Service>(() => true)

        const actual = yield* pipe(
          _.authenticate(code, referer.href),
          Effect.provideService(_.IsUserBlocked, isUserBlocked),
          Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
        )

        const sessions = yield* allSessions(keyValueStore)

        expect(sessions).toStrictEqual([])
        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: Routes.HomePage,
          message: 'blocked',
        })
        expect(isUserBlocked).toHaveBeenCalledWith(accessToken.orcid)
      }).pipe(
        Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled, unsign: shouldNotBeCalled })),
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
        Effect.provide(KeyValueStore.layerMemory),
      ),
  )

  it.effect.prop(
    'when the PREreviewer cannot be registered',
    [
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
    ],
    ([code, referer, orcidOauth, locale, accessToken, sessionCookie]) =>
      Effect.gen(function* () {
        const keyValueStore = yield* KeyValueStore.KeyValueStore
        const sessionStore = fromKeyValueStore(keyValueStore)
        const fetch = fetchMock.createInstance().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        })

        const actual = yield* pipe(
          _.authenticate(code, referer.href),
          Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          Effect.provideService(FetchHttpClient.Fetch, (...args) => fetch.fetchHandler(...args)),
        )

        const sessions = yield* allSessions(keyValueStore)

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
        Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled, unsign: shouldNotBeCalled })),
        Effect.provide(
          Layer.mock(Prereviewers, {
            register: () => new UnableToHandleCommand({}),
            isRegistered: () => Effect.succeed(false),
          }),
        ),
        Effect.provideService(_.IsUserBlocked, () => false),
        Effect.provideService(Locale, locale),
        Effect.provideService(OrcidOauth, orcidOauth),
        Effect.provideService(PublicUrl, new URL('/', referer)),
        Effect.provide(Uuid.layer),
        Effect.provide(KeyValueStore.layerMemory),
      ),
  )

  it.effect.prop(
    'when registration state for PREreviewer is not available',
    [
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
    ],
    ([code, referer, orcidOauth, locale, accessToken, sessionCookie]) =>
      Effect.gen(function* () {
        const keyValueStore = yield* KeyValueStore.KeyValueStore
        const sessionStore = fromKeyValueStore(keyValueStore)
        const fetch = fetchMock.createInstance().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        })

        const actual = yield* pipe(
          _.authenticate(code, referer.href),
          Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          Effect.provideService(FetchHttpClient.Fetch, (...args) => fetch.fetchHandler(...args)),
        )

        const sessions = yield* allSessions(keyValueStore)

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
        Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled, unsign: shouldNotBeCalled })),
        Effect.provide(Layer.mock(Prereviewers, { isRegistered: () => new UnableToQuery({}) })),
        Effect.provideService(_.IsUserBlocked, () => false),
        Effect.provideService(Locale, locale),
        Effect.provideService(OrcidOauth, orcidOauth),
        Effect.provideService(PublicUrl, new URL('/', referer)),
        Effect.provide(Uuid.layer),
        Effect.provide(KeyValueStore.layerMemory),
      ),
  )
})

describe('AuthenticateError', () => {
  it.effect.prop('with an access_denied error', [fc.supportedLocale()], ([locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )

  it.effect.prop('with an unknown error', [fc.string(), fc.supportedLocale()], ([error, locale]) =>
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
    }).pipe(Effect.provide(Layer.succeed(Locale, locale))),
  )
})

const allSessions = (store: KeyValueStore.KeyValueStore) =>
  Effect.flatMap(store.keys, keys =>
    Effect.forEach(keys, key =>
      Effect.map(store.get(key), value =>
        Tuple.make(key, value === undefined ? undefined : (JSON.parse(value) as unknown)),
      ),
    ),
  )
