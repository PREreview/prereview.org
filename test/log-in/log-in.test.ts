import { Cookies, FetchHttpClient, HttpServerResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import { Chunk, Duration, Effect, identity, Layer, pipe, Redacted, Stream, Struct } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as IO from 'fp-ts/lib/IO.js'
import Keyv from 'keyv'
import { DeprecatedLoggerEnv, Locale, SessionSecret, SessionStore } from '../../src/Context.ts'
import { CookieSignature } from '../../src/CookieSignature.ts'
import * as _ from '../../src/log-in/index.ts'
import { OrcidOauth } from '../../src/OrcidOauth.ts'
import { PublicUrl } from '../../src/public-url.ts'
import * as Routes from '../../src/routes.ts'
import { homeMatch } from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { Uuid } from '../../src/types/index.ts'
import { SessionId, UserC } from '../../src/user.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'
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
      fc.url(),
      fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
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
      fc.uuid(),
      fc.string(),
    ])(
      'when there is a name',
      (code, referer, orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, sessionId, signedSessionId) =>
        Effect.gen(function* () {
          const sessionStore = new Keyv()

          const actual = yield* pipe(
            _.authenticate(code, referer.href),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* all(sessionStore.iterator!(undefined))

          expect(sessions).toStrictEqual([
            [sessionId, { user: { name: accessToken.name, orcid: accessToken.orcid, pseudonym } }],
          ])
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
          Effect.provideService(DeprecatedLoggerEnv, { logger: () => IO.of(undefined), clock: SystemClock }),
          Effect.provideService(
            FetchHttpClient.Fetch,
            fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
              status: StatusCodes.OK,
              body: accessToken,
            }) as typeof FetchHttpClient.Fetch.Service,
          ),
          Effect.provideService(_.GetPseudonym, () => Effect.succeed(pseudonym)),
          Effect.provideService(_.IsUserBlocked, () => false),
          Effect.provideService(Locale, locale),
          Effect.provideService(OrcidOauth, orcidOauth),
          Effect.provideService(PublicUrl, new URL('/', referer)),
          Effect.provideService(SessionSecret, Redacted.make(secret)),
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(sessionId)),
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
        name: fc.string({ unit: fc.whiteSpaceCharacter() }),
        orcid: fc.orcidId(),
      }),
      fc.pseudonym(),
      fc.string(),
      fc.cookieName(),
      fc.uuid(),
      fc.string(),
    ])(
      "when there isn't a name",
      (code, referer, orcidOauth, locale, accessToken, pseudonym, secret, sessionCookie, sessionId, signedSessionId) =>
        Effect.gen(function* () {
          const sessionStore = new Keyv()

          const actual = yield* pipe(
            _.authenticate(code, referer.href),
            Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
          )

          const sessions = yield* all(sessionStore.iterator!(undefined))

          expect(sessions).toStrictEqual([
            [sessionId, { user: { name: `PREreviewer ${accessToken.orcid}`, orcid: accessToken.orcid, pseudonym } }],
          ])
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
          Effect.provideService(DeprecatedLoggerEnv, { logger: () => IO.of(undefined), clock: SystemClock }),
          Effect.provideService(
            FetchHttpClient.Fetch,
            fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
              status: StatusCodes.OK,
              body: accessToken,
            }) as typeof FetchHttpClient.Fetch.Service,
          ),
          Effect.provideService(_.GetPseudonym, () => Effect.succeed(pseudonym)),
          Effect.provideService(_.IsUserBlocked, () => false),
          Effect.provideService(Locale, locale),
          Effect.provideService(OrcidOauth, orcidOauth),
          Effect.provideService(PublicUrl, new URL('/', referer)),
          Effect.provideService(SessionSecret, Redacted.make(secret)),
          Effect.provideService(Uuid.GenerateUuid, Effect.succeed(sessionId)),
          EffectTest.run,
        ),
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
    fc.string(),
    fc.cookieName(),
  ])('when the user is blocked', (code, referer, orcidOauth, locale, accessToken, secret, sessionCookie) =>
    Effect.gen(function* () {
      const sessionStore = new Keyv()
      const isUserBlocked = jest.fn<_.IsUserBlockedEnv['isUserBlocked']>(_ => true)

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
        location: format(homeMatch.formatter, {}),
        message: 'blocked',
      })
      expect(isUserBlocked).toHaveBeenCalledWith(accessToken.orcid)
    }).pipe(
      Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled })),
      Effect.provideService(DeprecatedLoggerEnv, { logger: () => IO.of(undefined), clock: SystemClock }),
      Effect.provideService(
        FetchHttpClient.Fetch,
        fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        }) as typeof FetchHttpClient.Fetch.Service,
      ),
      Effect.provideService(_.GetPseudonym, shouldNotBeCalled),
      Effect.provideService(Locale, locale),
      Effect.provideService(OrcidOauth, orcidOauth),
      Effect.provideService(PublicUrl, new URL('/', referer)),
      Effect.provideService(SessionSecret, Redacted.make(secret)),
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
    fc.string(),
    fc.cookieName(),
  ])('when a pseudonym cannot be retrieved', (code, referer, orcidOauth, locale, accessToken, secret, sessionCookie) =>
    Effect.gen(function* () {
      const sessionStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
        status: StatusCodes.OK,
        body: accessToken,
      })

      const actual = yield* pipe(
        _.authenticate(code, referer.href),
        Effect.flip,
        Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
        Effect.provideService(FetchHttpClient.Fetch, fetch as typeof FetchHttpClient.Fetch.Service),
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
      expect(fetch.done()).toBeTruthy()
    }).pipe(
      Effect.provide(Layer.mock(CookieSignature, { sign: shouldNotBeCalled })),
      Effect.provideService(DeprecatedLoggerEnv, { logger: () => IO.of(undefined), clock: SystemClock }),
      Effect.provideService(
        FetchHttpClient.Fetch,
        fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        }) as typeof FetchHttpClient.Fetch.Service,
      ),

      Effect.provideService(_.GetPseudonym, () => Effect.fail('unavailable')),
      Effect.provideService(_.IsUserBlocked, () => false),
      Effect.provideService(Locale, locale),
      Effect.provideService(OrcidOauth, orcidOauth),
      Effect.provideService(PublicUrl, new URL('/', referer)),
      Effect.provideService(SessionSecret, Redacted.make(secret)),
      Effect.provide(Uuid.layer),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.string(),
    fc.url(),
    fc.oneof(fc.webUrl(), fc.string()),
    fc.oauth().map(Struct.evolve({ clientSecret: Redacted.make<string> })),
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
    fc.uuid(),
    fc.string(),
  ])(
    'when the state contains an invalid referer',
    (
      code,
      publicUrl,
      state,
      orcidOauth,
      locale,
      accessToken,
      pseudonym,
      secret,
      sessionCookie,
      sessionId,
      signedSessionId,
    ) =>
      Effect.gen(function* () {
        const sessionStore = new Keyv()

        const actual = yield* pipe(
          _.authenticate(code, state),
          Effect.provideService(SessionStore, { cookie: sessionCookie, store: sessionStore }),
        )

        const sessions = yield* all(sessionStore.iterator!(undefined))

        expect(sessions).toStrictEqual([
          [sessionId, { user: { name: expect.anything(), orcid: accessToken.orcid, pseudonym } }],
        ])
        expect(actual).toStrictEqual(
          HttpServerResponse.redirect(format(homeMatch.formatter, {}), {
            status: StatusCodes.Found,
            cookies: Cookies.fromIterable([
              Cookies.unsafeMakeCookie(sessionCookie, signedSessionId, { httpOnly: true, path: '/' }),
              Cookies.unsafeMakeCookie('flash-message', 'logged-in', { httpOnly: true, path: '/' }),
            ]),
          }),
        )
      }).pipe(
        Effect.provide(Layer.mock(CookieSignature, { sign: () => signedSessionId })),
        Effect.provideService(DeprecatedLoggerEnv, { logger: () => IO.of(undefined), clock: SystemClock }),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
            status: StatusCodes.OK,
            body: accessToken,
          }) as typeof FetchHttpClient.Fetch.Service,
        ),
        Effect.provideService(_.GetPseudonym, () => Effect.succeed(pseudonym)),
        Effect.provideService(_.IsUserBlocked, () => false),
        Effect.provideService(Locale, locale),
        Effect.provideService(OrcidOauth, orcidOauth),
        Effect.provideService(PublicUrl, publicUrl),
        Effect.provideService(SessionSecret, Redacted.make(secret)),
        Effect.provideService(Uuid.GenerateUuid, Effect.succeed(sessionId)),
        EffectTest.run,
      ),
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

function all<A>(iterable: AsyncIterable<A>): Effect.Effect<ReadonlyArray<A>, unknown> {
  return Stream.fromAsyncIterable(iterable, identity).pipe(Stream.runCollect, Effect.map(Chunk.toArray))
}
