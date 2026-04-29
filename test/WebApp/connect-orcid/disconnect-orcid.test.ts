import { it } from '@effect/vitest'
import { Effect } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import type { DeleteOrcidTokenEnv, GetOrcidTokenEnv } from '../../../src/orcid-token.ts'
import { disconnectOrcidMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/connect-orcid/disconnect-orcid.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('disconnectOrcid', () => {
  describe('when the user is logged in', () => {
    describe('when ORCID is connected', () => {
      describe('when the form is submitted', () => {
        it.effect.prop(
          'when the token can be deleted',
          [fc.oauth(), fc.user(), fc.supportedLocale(), fc.orcidToken()],
          ([orcidOauth, user, locale, orcidToken]) =>
            Effect.gen(function* () {
              const deleteOrcidToken = vi.fn<DeleteOrcidTokenEnv['deleteOrcidToken']>(_ => TE.right(undefined))
              const fetch = fetchMock.createInstance().postOnce({
                url: orcidOauth.revokeUrl.href,
                matcherFunction: ({ options }) =>
                  options.body ===
                  new URLSearchParams({
                    client_id: orcidOauth.clientId,
                    client_secret: orcidOauth.clientSecret,
                    token: orcidToken.accessToken,
                    token_type_hint: 'access_token',
                  }).toString(),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                response: { status: StatusCodes.OK },
              })

              const actual = yield* Effect.promise(
                _.disconnectOrcid({ locale, method: 'POST', user })({
                  deleteOrcidToken,
                  fetch: (...args) => fetch.fetchHandler(...args),
                  getOrcidToken: () => TE.right(orcidToken),
                  orcidOauth,
                }),
              )

              expect(actual).toStrictEqual({
                _tag: 'FlashMessageResponse',
                location: format(myDetailsMatch.formatter, {}),
                message: 'orcid-disconnected',
              })
              expect(deleteOrcidToken).toHaveBeenCalledWith(user.orcid)
              expect(fetch.callHistory.done()).toBeTruthy()
            }),
        )

        it.effect.prop(
          "when the token can't be deleted",
          [fc.oauth(), fc.user(), fc.supportedLocale(), fc.orcidToken()],
          ([orcidOauth, user, locale, orcidToken]) =>
            Effect.gen(function* () {
              const actual = yield* Effect.promise(
                _.disconnectOrcid({ locale, method: 'POST', user })({
                  deleteOrcidToken: () => TE.left('unavailable'),
                  fetch: shouldNotBeCalled,
                  getOrcidToken: () => TE.right(orcidToken),
                  orcidOauth,
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
            }),
        )
      })

      it.effect.prop(
        'when the form is ready',
        [fc.oauth(), fc.user(), fc.supportedLocale(), fc.string().filter(string => string !== 'POST'), fc.orcidToken()],
        ([orcidOauth, user, locale, method, orcidToken]) =>
          Effect.gen(function* () {
            const actual = yield* Effect.promise(
              _.disconnectOrcid({ locale, method, user })({
                deleteOrcidToken: shouldNotBeCalled,
                fetch: shouldNotBeCalled,
                getOrcidToken: () => TE.right(orcidToken),
                orcidOauth,
              }),
            )

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              canonical: format(disconnectOrcidMatch.formatter, {}),
              status: StatusCodes.OK,
              title: expect.anything(),
              main: expect.anything(),
              skipToLabel: 'form',
              js: [],
            })
          }),
      )
    })

    it.effect.prop(
      'when ORCID is not already connected',
      [fc.oauth(), fc.user(), fc.supportedLocale(), fc.string()],
      ([orcidOauth, user, locale, method]) =>
        Effect.gen(function* () {
          const getOrcidToken = vi.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

          const actual = yield* Effect.promise(
            _.disconnectOrcid({ locale, method, user })({
              deleteOrcidToken: shouldNotBeCalled,
              fetch: shouldNotBeCalled,
              getOrcidToken,
              orcidOauth,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
          expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
        }),
    )

    it.effect.prop(
      "when we can't load the ORCID token",
      [fc.oauth(), fc.user(), fc.supportedLocale(), fc.string()],
      ([orcidOauth, user, locale, method]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.disconnectOrcid({ locale, method, user })({
              deleteOrcidToken: shouldNotBeCalled,
              fetch: shouldNotBeCalled,
              getOrcidToken: () => TE.left('unavailable'),
              orcidOauth,
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
        }),
    )
  })

  it.effect.prop(
    'when the user is not logged in',
    [fc.oauth(), fc.supportedLocale(), fc.string()],
    ([orcidOauth, locale, method]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.disconnectOrcid({ locale, method })({
            deleteOrcidToken: shouldNotBeCalled,
            fetch: shouldNotBeCalled,
            getOrcidToken: shouldNotBeCalled,
            orcidOauth,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(disconnectOrcidMatch.formatter, {}),
        })
      }),
  )
})
