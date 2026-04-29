import { it } from '@effect/vitest'
import { Effect } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect, vi } from 'vitest'
import type { EditOrcidTokenEnv } from '../../../src/orcid-token.ts'
import { connectOrcidMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/connect-orcid/oauth-code.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('connectOrcidCode', () => {
  describe('when the access token can be decoded', () => {
    it.effect.prop(
      'there is a token already',
      [
        fc.string(),
        fc.user(),
        fc.supportedLocale(),
        fc.oauth(),
        fc.origin(),
        fc.hashSet(fc.lorem({ maxCount: 1 }), { minLength: 1 }),
        fc.nonEmptyString(),
        fc.orcidToken(),
      ],
      ([code, user, locale, orcidOauth, publicUrl, scopes, accessToken, existingToken]) =>
        Effect.gen(function* () {
          const fetch = fetchMock
            .createInstance()
            .postOnce({
              url: orcidOauth.tokenUrl.href,
              matcherFunction: ({ options }) =>
                options.body ===
                new URLSearchParams({
                  client_id: orcidOauth.clientId,
                  client_secret: orcidOauth.clientSecret,
                  grant_type: 'authorization_code',
                  redirect_uri: new URL(format(connectOrcidMatch.formatter, {}), publicUrl).toString(),
                  code,
                }).toString(),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              response: {
                status: StatusCodes.OK,
                body: {
                  access_token: accessToken,
                  orcid: user.orcid,
                  token_type: 'user',
                  scope: [...scopes].join(' '),
                },
              },
            })
            .postOnce({
              url: orcidOauth.revokeUrl.href,
              matcherFunction: ({ options }) =>
                options.body ===
                new URLSearchParams({
                  client_id: orcidOauth.clientId,
                  client_secret: orcidOauth.clientSecret,
                  token: existingToken.accessToken,
                  token_type_hint: 'access_token',
                }).toString(),
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              response: {
                status: StatusCodes.OK,
              },
            })
          const saveOrcidToken = vi.fn<EditOrcidTokenEnv['saveOrcidToken']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.connectOrcidCode({ code, locale, user })({
              fetch: (...args) => fetch.fetchHandler(...args),
              getOrcidToken: () => TE.right(existingToken),
              orcidOauth,
              publicUrl,
              saveOrcidToken,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'FlashMessageResponse',
            location: format(myDetailsMatch.formatter, {}),
            message: 'orcid-connected',
          })
          expect(saveOrcidToken).toHaveBeenCalledWith(user.orcid, { accessToken, scopes })
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      "there isn't a token already",
      [
        fc.string(),
        fc.user(),
        fc.supportedLocale(),
        fc.oauth(),
        fc.origin(),
        fc.hashSet(fc.lorem({ maxCount: 1 }), { minLength: 1 }),
        fc.nonEmptyString(),
      ],
      ([code, user, locale, orcidOauth, publicUrl, scopes, accessToken]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: orcidOauth.tokenUrl.href,
            matcherFunction: ({ options }) =>
              options.body ===
              new URLSearchParams({
                client_id: orcidOauth.clientId,
                client_secret: orcidOauth.clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: new URL(format(connectOrcidMatch.formatter, {}), publicUrl).toString(),
                code,
              }).toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            response: {
              status: StatusCodes.OK,
              body: {
                access_token: accessToken,
                orcid: user.orcid,
                token_type: 'user',
                scope: [...scopes].join(' '),
              },
            },
          })
          const saveOrcidToken = vi.fn<EditOrcidTokenEnv['saveOrcidToken']>(_ => TE.right(undefined))

          const actual = yield* Effect.promise(
            _.connectOrcidCode({ code, locale, user })({
              fetch: (...args) => fetch.fetchHandler(...args),
              getOrcidToken: () => TE.left('not-found'),
              orcidOauth,
              publicUrl,
              saveOrcidToken,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'FlashMessageResponse',
            location: format(myDetailsMatch.formatter, {}),
            message: 'orcid-connected',
          })
          expect(saveOrcidToken).toHaveBeenCalledWith(user.orcid, { accessToken, scopes })
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )
  })

  it.effect.prop(
    'when the access token cannot be decoded',
    [fc.string(), fc.user(), fc.supportedLocale(), fc.oauth(), fc.origin(), fc.string()],
    ([code, user, locale, orcidOauth, publicUrl, accessToken]) =>
      Effect.gen(function* () {
        const orcidUserIdStore = new Keyv()
        const fetch = fetchMock.createInstance().postOnce(orcidOauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        })

        const actual = yield* Effect.promise(
          _.connectOrcidCode({ code, locale, user })({
            fetch: (...args) => fetch.fetchHandler(...args),
            getOrcidToken: shouldNotBeCalled,
            orcidOauth,
            publicUrl,
            saveOrcidToken: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(yield* Effect.promise(() => orcidUserIdStore.has(user.orcid))).toBeFalsy()
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the response has a non-200/404 status code',
    [
      fc.string(),
      fc.user(),
      fc.supportedLocale(),
      fc.oauth(),
      fc.origin(),
      fc
        .integer({ min: 200, max: 599 })
        .filter(status => status !== (StatusCodes.OK as number) && status !== (StatusCodes.NotFound as number)),
    ],
    ([code, user, locale, oauth, publicUrl, accessToken]) =>
      Effect.gen(function* () {
        const orcidUserIdStore = new Keyv()
        const fetch = fetchMock.createInstance().postOnce(oauth.tokenUrl.href, {
          status: StatusCodes.OK,
          body: accessToken,
        })

        const actual = yield* Effect.promise(
          _.connectOrcidCode({ code, locale, user })({
            fetch: (...args) => fetch.fetchHandler(...args),
            getOrcidToken: shouldNotBeCalled,
            publicUrl,
            orcidOauth: oauth,
            saveOrcidToken: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(yield* Effect.promise(() => orcidUserIdStore.has(user.orcid))).toBeFalsy()
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when fetch throws an error',
    [fc.string(), fc.user(), fc.supportedLocale(), fc.oauth(), fc.origin(), fc.error()],
    ([code, user, locale, orcidOauth, publicUrl, error]) =>
      Effect.gen(function* () {
        const orcidUserIdStore = new Keyv()

        const actual = yield* Effect.promise(
          _.connectOrcidCode({ code, locale, user })({
            fetch: () => Promise.reject(error),
            getOrcidToken: shouldNotBeCalled,
            orcidOauth,
            publicUrl,
            saveOrcidToken: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(yield* Effect.promise(() => orcidUserIdStore.has(user.orcid))).toBeFalsy()
      }),
  )
})
