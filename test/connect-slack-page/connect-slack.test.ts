import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { StatusCodes } from 'http-status-codes'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import * as _ from '../../src/connect-slack-page/index.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../../src/routes.js'
import type { AddToSessionEnv, PopFromSessionEnv } from '../../src/session.js'
import type { EditSlackUserIdEnv } from '../../src/slack-user-id.js'
import type { GenerateUuidEnv } from '../../src/types/uuid.js'
import * as fc from '../fc.js'
import { runMiddleware } from '../middleware.js'
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
    fc.connection(),
  ])(
    'when the access token can be decoded',
    async (code, user, locale, oauth, publicUrl, userId, scopes, accessToken, state, connection) => {
      const saveSlackUserId = jest.fn<EditSlackUserIdEnv['saveSlackUserId']>(_ => TE.right(undefined))
      const popFromSession = jest.fn<PopFromSessionEnv['popFromSession']>(_ => TE.right(state))

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
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
                'Content-Type': MediaType.applicationFormURLEncoded,
              },
            },
            {
              status: Status.OK,
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
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl,
          saveSlackUserId,
          slackOauth: oauth,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'slack-connected' },
          { type: 'endResponse' },
        ]),
      )
      expect(popFromSession).toHaveBeenCalledWith('slack-state')
      expect(saveSlackUserId).toHaveBeenCalledWith(user.orcid, { accessToken, scopes, userId })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.string(),
    fc.string(),
    fc.connection(),
    fc.html(),
  ])(
    'when the access token cannot be decoded',
    async (code, user, userOnboarding, locale, oauth, publicUrl, accessToken, state, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const slackUserIdStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
        status: Status.OK,
        body: accessToken,
      })

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch,
          popFromSession: () => TE.right(state),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          locale,
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
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
        user,
        userOnboarding,
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.string(),
    fc.string(),
    fc.connection(),
    fc.html(),
  ])(
    "when the state doesn't match",
    async (code, user, userOnboarding, locale, oauth, publicUrl, state, actualState, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch: shouldNotBeCalled,
          popFromSession: () => TE.right(actualState),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          locale,
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
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
        user,
        userOnboarding,
      })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
    fc.lorem(),
    fc.connection(),
    fc.html(),
  ])(
    'when the response has a non-200/404 status code',
    async (code, user, userOnboarding, locale, oauth, publicUrl, accessToken, state, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const slackUserIdStore = new Keyv()
      const fetch = fetchMock.sandbox().postOnce(oauth.tokenUrl.href, {
        status: Status.OK,
        body: accessToken,
      })

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch,
          popFromSession: () => TE.right(state),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          locale,
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
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
        user,
        userOnboarding,
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
    fc.error(),
    fc.string(),
    fc.connection(),
    fc.html(),
  ])(
    'when fetch throws an error',
    async (code, user, userOnboarding, locale, oauth, publicUrl, error, state, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const slackUserIdStore = new Keyv()

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch: () => Promise.reject(error),
          popFromSession: () => TE.right(state),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          locale,
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
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
        user,
        userOnboarding,
      })
      expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
    },
  )
})

describe('connectSlackError', () => {
  test.prop([
    fc.either(fc.oneof(fc.error(), fc.constant('no-session')), fc.user()),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.connection(),
    fc.html(),
  ])('with an access_denied error', async (user, userOnboarding, locale, connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.connectSlackError('access_denied')({
        getUser: () => M.fromEither(user),
        getUserOnboarding: () => TE.right(userOnboarding),
        locale,
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
      user: E.isRight(user) ? user.right : undefined,
      userOnboarding: E.isRight(user) ? userOnboarding : undefined,
    })
  })

  test.prop([
    fc.either(fc.oneof(fc.error(), fc.constant('no-session')), fc.user()),
    fc.userOnboarding(),
    fc.supportedLocale(),
    fc.string(),
    fc.connection(),
    fc.html(),
  ])('with an unknown error', async (user, userOnboarding, locale, error, connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.connectSlackError(error)({
        getUser: () => M.fromEither(user),
        getUserOnboarding: () => TE.right(userOnboarding),
        locale,
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
      user: E.isRight(user) ? user.right : undefined,
      userOnboarding: E.isRight(user) ? userOnboarding : undefined,
    })
  })
})
