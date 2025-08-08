import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { StatusCodes } from 'http-status-codes'
import Keyv from 'keyv'
import * as _ from '../../src/connect-slack-page/index.js'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../../src/routes.js'
import type { AddToSessionEnv, PopFromSessionEnv } from '../../src/session.js'
import type { EditSlackUserIdEnv } from '../../src/slack-user-id.js'
import type { GenerateUuidEnv } from '../../src/types/uuid.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('connectSlack', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user(), fc.supportedLocale()])('when the Slack is not already connected', async (user, locale) => {
      const actual = await _.connectSlack({ locale, user })({
        isSlackUser: () => TE.right(false),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.user(), fc.supportedLocale()])('when the Slack is connected', async (user, locale) => {
      const actual = await _.connectSlack({ locale, user })({
        isSlackUser: () => TE.right(true),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: format(connectSlackStartMatch.formatter, {}),
      })
    })

    test.prop([fc.user(), fc.supportedLocale()])("when the Slack user can't be loaded", async (user, locale) => {
      const actual = await _.connectSlack({ locale, user })({
        isSlackUser: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.supportedLocale()])('when the user is not logged in', async locale => {
    const actual = await _.connectSlack({ locale, user: undefined })({
      isSlackUser: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectSlackMatch.formatter, {}),
    })
  })
})

describe('connectSlackStart', () => {
  test.prop([fc.oauth(), fc.supportedLocale(), fc.origin(), fc.uuid(), fc.user()])(
    'when the user is logged in',
    async (slackOauth, locale, publicUrl, uuid, user) => {
      const generateUuid = jest.fn<GenerateUuidEnv['generateUuid']>(() => uuid)
      const addToSession = jest.fn<AddToSessionEnv['addToSession']>(_ => TE.of(undefined))

      const actual = await _.connectSlackStart({ locale, user })({
        addToSession,
        generateUuid,
        publicUrl,
        slackOauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: new URL(
          `?${new URLSearchParams({
            client_id: slackOauth.clientId,
            response_type: 'code',
            redirect_uri: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
            user_scope: 'users.profile:read,users.profile:write',
            state: uuid,
            team: 'T057XMB3EGH',
          }).toString()}`,
          slackOauth.authorizeUrl,
        ),
      })
      expect(generateUuid).toHaveBeenCalledTimes(1)
      expect(addToSession).toHaveBeenCalledWith('slack-state', uuid)
    },
  )

  test.prop([fc.oauth(), fc.supportedLocale(), fc.origin()])(
    'when the user is not logged in',
    async (slackOauth, locale, publicUrl) => {
      const actual = await _.connectSlackStart({ locale, user: undefined })({
        addToSession: shouldNotBeCalled,
        generateUuid: shouldNotBeCalled,
        publicUrl,
        slackOauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(connectSlackMatch.formatter, {}),
      })
    },
  )
})

describe('connectSlackCode', () => {
  test.prop([
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.nonEmptyString(),
    fc.hashSet(fc.lorem(), { minLength: 1 }),
    fc.nonEmptyString(),
    fc.lorem(),
  ])(
    'when the access token can be decoded',
    async (code, user, locale, oauth, publicUrl, userId, scopes, accessToken, state) => {
      const saveSlackUserId = jest.fn<EditSlackUserIdEnv['saveSlackUserId']>(_ => TE.right(undefined))
      const popFromSession = jest.fn<PopFromSessionEnv['popFromSession']>(_ => TE.right(state))

      const actual = await _.connectSlackCode({ code, locale, state, user })({
        fetch: fetchMock.sandbox().postOnce(
          {
            url: oauth.tokenUrl.href,
            functionMatcher: (_, req: RequestInit) =>
              req.body ===
              new URLSearchParams({
                client_id: oauth.clientId,
                client_secret: oauth.clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
                code,
              }).toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
          {
            status: StatusCodes.OK,
            body: {
              authed_user: {
                id: userId,
                access_token: accessToken,
                token_type: 'user',
                scope: [...scopes].join(','),
              },
            },
          },
        ),
        popFromSession,
        publicUrl,
        saveSlackUserId,
        slackOauth: oauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        message: 'slack-connected',
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(popFromSession).toHaveBeenCalledWith('slack-state')
      expect(saveSlackUserId).toHaveBeenCalledWith(user.orcid, { accessToken, scopes, userId })
    },
  )

  test.prop([fc.string(), fc.user(), fc.supportedLocale(), fc.oauth(), fc.origin(), fc.string(), fc.string()])(
    'when the access token cannot be decoded',
    async (code, user, locale, oauth, publicUrl, accessToken, state) => {
      const slackUserIdStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
        status: StatusCodes.OK,
        body: accessToken,
      })

      const actual = await _.connectSlackCode({ code, locale, state, user })({
        fetch,
        popFromSession: () => TE.right(state),
        publicUrl,
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.user(), fc.supportedLocale(), fc.oauth(), fc.origin(), fc.string(), fc.string()])(
    "when the state doesn't match",
    async (code, user, locale, oauth, publicUrl, state, actualState) => {
      const actual = await _.connectSlackCode({ code, locale, state, user })({
        fetch: shouldNotBeCalled,
        popFromSession: () => TE.right(actualState),
        publicUrl,
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => ![StatusCodes.OK, StatusCodes.NOT_FOUND].includes(status)),
    fc.lorem(),
  ])(
    'when the response has a non-200/404 status code',
    async (code, user, locale, oauth, publicUrl, accessToken, state) => {
      const slackUserIdStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
        status: StatusCodes.OK,
        body: accessToken,
      })

      const actual = await _.connectSlackCode({ code, locale, state, user })({
        fetch,
        popFromSession: () => TE.right(state),
        publicUrl,
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.user(), fc.supportedLocale(), fc.oauth(), fc.origin(), fc.error(), fc.string()])(
    'when fetch throws an error',
    async (code, user, locale, oauth, publicUrl, error, state) => {
      const slackUserIdStore = new Keyv()

      const actual = await _.connectSlackCode({ code, locale, state, user })({
        fetch: () => Promise.reject(error),
        popFromSession: () => TE.right(state),
        publicUrl,
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
    },
  )
})

describe('connectSlackError', () => {
  test.prop([fc.supportedLocale()])('with an access_denied error', locale => {
    const actual = _.connectSlackError({ error: 'access_denied', locale })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.FORBIDDEN,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale(), fc.string()])('with an unknown error', (locale, error) => {
    const actual = _.connectSlackError({ error, locale })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.SERVICE_UNAVAILABLE,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
