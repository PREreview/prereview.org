import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import * as _ from '../../src/connect-slack-page/index.js'
import { rawHtml } from '../../src/html.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../../src/routes.js'
import type { EditSlackUserIdEnv } from '../../src/slack-user-id.js'
import type { GenerateUuidEnv } from '../../src/types/uuid.js'
import type { GetUserOnboardingEnv } from '../../src/user-onboarding.js'
import * as fc from '../fc.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('connectSlack', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.oauth(), fc.user(), fc.connection(), fc.userOnboarding(), fc.html()])(
      'when the Slack is not already connected',
      async (orcidOauth, user, connection, userOnboarding, page) => {
        const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.connectSlack({
            isSlackUser: () => TE.right(false),
            getUser: () => M.of(user),
            getUserOnboarding,
            orcidOauth,
            publicUrl: new URL('http://example.com'),
            templatePage,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, private' },
            { type: 'setHeader', name: 'Vary', value: 'Cookie' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: page.toString() },
          ]),
        )

        expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
        expect(templatePage).toHaveBeenCalledWith({
          title: expect.stringContaining('Connect'),
          content: expect.stringContaining('Connect'),
          skipLinks: [[rawHtml('Skip to main content'), '#main']],
          js: [],
          user,
          userOnboarding,
        })
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.connection()])(
      'when the Slack is connected',
      async (orcidOauth, user, connection) => {
        const actual = await runMiddleware(
          _.connectSlack({
            isSlackUser: () => TE.right(true),
            getUser: () => M.of(user),
            getUserOnboarding: shouldNotBeCalled,
            orcidOauth,
            publicUrl: new URL('http://example.com'),
            templatePage: shouldNotBeCalled,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: format(connectSlackStartMatch.formatter, {}),
            },
            { type: 'endResponse' },
          ]),
        )
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.connection(), fc.html()])(
      "when the Slack user can't be loaded",
      async (orcidOauth, user, connection, page) => {
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.connectSlack({
            isSlackUser: () => TE.left('unavailable'),
            getUser: () => M.of(user),
            getUserOnboarding: shouldNotBeCalled,
            orcidOauth,
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
          title: expect.stringContaining('having problems'),
          content: expect.stringContaining('having problems'),
          skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
          user,
        })
      },
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (orcidOauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.connectSlack({
          isSlackUser: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          getUserOnboarding: shouldNotBeCalled,
          orcidOauth,
          publicUrl,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: orcidOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL('/orcid', publicUrl).toString(),
                scope: '/authenticate',
                state: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              orcidOauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

describe('connectSlackStart', () => {
  test.prop([fc.oauth(), fc.oauth(), fc.origin(), fc.uuid(), fc.string(), fc.user(), fc.connection()])(
    'when the user is logged in',
    async (orcidOauth, slackOauth, publicUrl, uuid, signedValue, user, connection) => {
      const generateUuid = jest.fn<GenerateUuidEnv['generateUuid']>(() => uuid)
      const signValue = jest.fn<_.SignValueEnv['signValue']>(_ => signedValue)

      const actual = await runMiddleware(
        _.connectSlackStart({
          generateUuid,
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
          signValue,
          slackOauth,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: slackOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
                user_scope: 'users.profile:read,users.profile:write',
                state: uuid,
                team: 'T057XMB3EGH',
              }).toString()}`,
              slackOauth.authorizeUrl,
            ).href,
          },
          { type: 'setCookie', name: 'slack-state', options: { httpOnly: true }, value: signedValue },
          { type: 'endResponse' },
        ]),
      )
      expect(generateUuid).toHaveBeenCalledTimes(1)
      expect(signValue).toHaveBeenCalledWith(uuid)
    },
  )

  test.prop([fc.oauth(), fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (orcidOauth, slackOauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.connectSlackStart({
          generateUuid: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          orcidOauth,
          publicUrl,
          signValue: shouldNotBeCalled,
          slackOauth,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: orcidOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL('/orcid', publicUrl).toString(),
                scope: '/authenticate',
                state: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              orcidOauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

describe('connectSlackCode', () => {
  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.origin(),
    fc.nonEmptyString(),
    fc.set(fc.lorem(), { minLength: 1 }),
    fc.nonEmptyString(),
    fc.lorem(),
    fc
      .lorem()
      .chain(state =>
        fc.tuple(fc.constant(state), fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
      ),
  ])(
    'when the access token can be decoded',
    async (code, user, oauth, publicUrl, userId, scopes, accessToken, state, [signedState, connection]) => {
      const saveSlackUserId = jest.fn<EditSlackUserIdEnv['saveSlackUserId']>(_ => TE.right(undefined))
      const unsignValue = jest.fn<_.UnsignValueEnv['unsignValue']>(_ => O.some(state))

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
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl,
          saveSlackUserId,
          slackOauth: oauth,
          templatePage: shouldNotBeCalled,
          unsignValue,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'slack-connected' },
          { type: 'endResponse' },
        ]),
      )
      expect(unsignValue).toHaveBeenCalledWith(signedState)
      expect(saveSlackUserId).toHaveBeenCalledWith(user.orcid, { accessToken, scopes, userId })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.oauth(),
    fc.origin(),
    fc.string(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
    fc.html(),
  ])(
    'when the access token cannot be decoded',
    async (code, user, userOnboarding, oauth, publicUrl, accessToken, state, connection, page) => {
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
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
          templatePage,
          unsignValue: () => O.some(state),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('Sorry'),
        content: expect.stringContaining('problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main']],
        js: [],
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
    fc.oauth(),
    fc.origin(),
    fc.string(),
    fc.string(),
    fc.connection({
      headers: fc.record({ Cookie: fc.lorem() }, { withDeletedKeys: true }),
    }),
    fc.html(),
  ])(
    "when the state doesn't match",
    async (code, user, userOnboarding, oauth, publicUrl, state, unsignedState, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch: shouldNotBeCalled,
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
          templatePage,
          unsignValue: () => O.some(unsignedState),
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
        title: expect.stringContaining('Sorry'),
        content: expect.stringContaining('problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main']],
        js: [],
        user,
        userOnboarding,
      })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.oauth(),
    fc.origin(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
    fc.html(),
  ])(
    "when the state can't be unsigned",
    async (code, user, userOnboarding, oauth, publicUrl, state, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch: shouldNotBeCalled,
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
          templatePage,
          unsignValue: () => O.none,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('Sorry'),
        content: expect.stringContaining('problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main']],
        js: [],
        user,
        userOnboarding,
      })
    },
  )

  test.prop([
    fc.string(),
    fc.user(),
    fc.userOnboarding(),
    fc.oauth(),
    fc.origin(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
    fc
      .lorem()
      .chain(state =>
        fc.tuple(fc.constant(state), fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
      ),
    fc.html(),
  ])(
    'when the response has a non-200/404 status code',
    async (code, user, userOnboarding, oauth, publicUrl, accessToken, [state, connection], page) => {
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
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
          templatePage,
          unsignValue: () => O.some(state),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('Sorry'),
        content: expect.stringContaining('problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main']],
        js: [],
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
    fc.oauth(),
    fc.origin(),
    fc.error(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
    fc.html(),
  ])(
    'when fetch throws an error',
    async (code, user, userOnboarding, oauth, publicUrl, error, state, connection, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const slackUserIdStore = new Keyv()

      const actual = await runMiddleware(
        _.connectSlackCode(
          code,
          state,
        )({
          fetch: () => Promise.reject(error),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          saveSlackUserId: shouldNotBeCalled,
          slackOauth: oauth,
          templatePage,
          unsignValue: () => O.some(state),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('Sorry'),
        content: expect.stringContaining('problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main']],
        js: [],
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
    fc.connection(),
    fc.html(),
  ])('with an access_denied error', async (user, userOnboarding, connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.connectSlackError('access_denied')({
        getUser: () => M.fromEither(user),
        getUserOnboarding: () => TE.right(userOnboarding),
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
      title: expect.stringContaining('Sorry'),
      content: expect.stringContaining('connect'),
      skipLinks: [[rawHtml('Skip to main content'), '#main']],
      js: [],
      user: E.isRight(user) ? user.right : undefined,
      userOnboarding: E.isRight(user) ? userOnboarding : undefined,
    })
  })

  test.prop([
    fc.either(fc.oneof(fc.error(), fc.constant('no-session')), fc.user()),
    fc.userOnboarding(),
    fc.string(),
    fc.connection(),
    fc.html(),
  ])('with an unknown error', async (user, userOnboarding, error, connection, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.connectSlackError(error)({
        getUser: () => M.fromEither(user),
        getUserOnboarding: () => TE.right(userOnboarding),
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
      title: expect.stringContaining('Sorry'),
      content: expect.stringContaining('problems'),
      skipLinks: [[rawHtml('Skip to main content'), '#main']],
      js: [],
      user: E.isRight(user) ? user.right : undefined,
      userOnboarding: E.isRight(user) ? userOnboarding : undefined,
    })
  })
})
