import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid/disconnect-orcid'
import type { DeleteOrcidTokenEnv, GetOrcidTokenEnv } from '../../src/orcid-token'
import { disconnectOrcidMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('disconnectOrcid', () => {
  describe('when the user is logged in', () => {
    describe('when ORCID is connected', () => {
      describe('when the form is submitted', () => {
        test.prop([fc.oauth(), fc.user(), fc.orcidToken()])(
          'when the token can be deleted',
          async (orcidOauth, user, orcidToken) => {
            const deleteOrcidToken = jest.fn<DeleteOrcidTokenEnv['deleteOrcidToken']>(_ => TE.right(undefined))
            const fetch = fetchMock.sandbox().postOnce(
              {
                url: orcidOauth.revokeUrl.href,
                functionMatcher: (_, req: RequestInit) =>
                  req.body ===
                  new URLSearchParams({
                    client_id: orcidOauth.clientId,
                    client_secret: orcidOauth.clientSecret,
                    token: orcidToken.accessToken,
                    token_type_hint: 'access_token',
                  }).toString(),
                headers: { 'Content-Type': MediaType.applicationFormURLEncoded },
              },
              { status: Status.OK },
            )

            const actual = await _.disconnectOrcid({ method: 'POST', user })({
              deleteOrcidToken,
              fetch,
              getOrcidToken: () => TE.right(orcidToken),
              orcidOauth,
            })()

            expect(actual).toStrictEqual({
              _tag: 'FlashMessageResponse',
              location: format(myDetailsMatch.formatter, {}),
              message: 'orcid-disconnected',
            })
            expect(deleteOrcidToken).toHaveBeenCalledWith(user.orcid)
            expect(fetch.done()).toBeTruthy()
          },
        )

        test.prop([fc.oauth(), fc.user(), fc.orcidToken()])(
          "when the token can't be deleted",
          async (orcidOauth, user, orcidToken) => {
            const actual = await _.disconnectOrcid({ method: 'POST', user })({
              deleteOrcidToken: () => TE.left('unavailable'),
              fetch: shouldNotBeCalled,
              getOrcidToken: () => TE.right(orcidToken),
              orcidOauth,
            })()

            expect(actual).toStrictEqual({
              _tag: 'PageResponse',
              status: Status.ServiceUnavailable,
              title: expect.stringContaining('problems'),
              main: expect.stringContaining('problems'),
              skipToLabel: 'main',
              js: [],
            })
          },
        )
      })

      test.prop([fc.oauth(), fc.user(), fc.string().filter(string => string !== 'POST'), fc.orcidToken()])(
        'when the form is ready',
        async (orcidOauth, user, method, orcidToken) => {
          const actual = await _.disconnectOrcid({ method, user })({
            deleteOrcidToken: shouldNotBeCalled,
            fetch: shouldNotBeCalled,
            getOrcidToken: () => TE.right(orcidToken),
            orcidOauth,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(disconnectOrcidMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Disconnect'),
            main: expect.stringContaining('disconnect'),
            skipToLabel: 'form',
            js: [],
          })
        },
      )
    })

    test.prop([fc.oauth(), fc.user(), fc.string()])(
      'when ORCID is not already connected',
      async (orcidOauth, user, method) => {
        const getOrcidToken = jest.fn<GetOrcidTokenEnv['getOrcidToken']>(_ => TE.left('not-found'))

        const actual = await _.disconnectOrcid({ method, user })({
          deleteOrcidToken: shouldNotBeCalled,
          fetch: shouldNotBeCalled,
          getOrcidToken,
          orcidOauth,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
        expect(getOrcidToken).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.string()])(
      "when we can't load the ORCID token",
      async (orcidOauth, user, method) => {
        const actual = await _.disconnectOrcid({ method, user })({
          deleteOrcidToken: shouldNotBeCalled,
          fetch: shouldNotBeCalled,
          getOrcidToken: () => TE.left('unavailable'),
          orcidOauth,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.oauth(), fc.string()])('when the user is not logged in', async (orcidOauth, method) => {
    const actual = await _.disconnectOrcid({ method })({
      deleteOrcidToken: shouldNotBeCalled,
      fetch: shouldNotBeCalled,
      getOrcidToken: shouldNotBeCalled,
      orcidOauth,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(disconnectOrcidMatch.formatter, {}),
    })
  })
})
