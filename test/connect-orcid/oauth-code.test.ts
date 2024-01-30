import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import * as _ from '../../src/connect-orcid/oauth-code'
import type { EditOrcidTokenEnv } from '../../src/orcid-token'
import { connectOrcidMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('connectOrcidCode', () => {
  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.origin(),
    fc.set(fc.lorem({ maxCount: 1 }), { minLength: 1 }),
    fc.nonEmptyString(),
  ])('when the access token can be decoded', async (code, user, orcidOauth, publicUrl, scopes, accessToken) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: orcidOauth.tokenUrl.href,
        functionMatcher: (_, req: RequestInit) =>
          req.body ===
          new URLSearchParams({
            client_id: orcidOauth.clientId,
            client_secret: orcidOauth.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: new URL(format(connectOrcidMatch.formatter, {}), publicUrl).toString(),
            code,
          }).toString(),
        headers: {
          'Content-Type': MediaType.applicationFormURLEncoded,
        },
      },
      {
        status: Status.OK,
        body: {
          access_token: accessToken,
          orcid: user.orcid,
          token_type: 'user',
          scope: [...scopes].join(' '),
        },
      },
    )
    const saveOrcidToken = jest.fn<EditOrcidTokenEnv['saveOrcidToken']>(_ => TE.right(undefined))

    const actual = await _.connectOrcidCode({ code, user })({
      fetch,
      orcidOauth,
      publicUrl,
      saveOrcidToken,
    })()

    expect(actual).toStrictEqual({
      _tag: 'FlashMessageResponse',
      location: format(myDetailsMatch.formatter, {}),
      message: 'orcid-connected',
    })
    expect(saveOrcidToken).toHaveBeenCalledWith(user.orcid, { accessToken, scopes })
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.string(), fc.user(), fc.oauth(), fc.origin(), fc.string()])(
    'when the access token cannot be decoded',
    async (code, user, orcidOauth, publicUrl, accessToken) => {
      const orcidUserIdStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(orcidOauth.tokenUrl.href, {
        status: Status.OK,
        body: accessToken,
      })

      const actual = await _.connectOrcidCode({ code, user })({
        fetch,
        orcidOauth,
        publicUrl,
        saveOrcidToken: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(await orcidUserIdStore.has(user.orcid)).toBeFalsy()
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
  ])('when the response has a non-200/404 status code', async (code, user, oauth, publicUrl, accessToken) => {
    const orcidUserIdStore = new Keyv()
    const fetch = fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
      status: Status.OK,
      body: accessToken,
    })

    const actual = await _.connectOrcidCode({ code, user })({
      fetch,
      publicUrl,
      orcidOauth: oauth,
      saveOrcidToken: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
    expect(await orcidUserIdStore.has(user.orcid)).toBeFalsy()
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.string(), fc.user(), fc.oauth(), fc.origin(), fc.error()])(
    'when fetch throws an error',
    async (code, user, orcidOauth, publicUrl, error) => {
      const orcidUserIdStore = new Keyv()

      const actual = await _.connectOrcidCode({ code, user })({
        fetch: () => Promise.reject(error),
        orcidOauth,
        publicUrl,
        saveOrcidToken: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(await orcidUserIdStore.has(user.orcid)).toBeFalsy()
    },
  )
})
