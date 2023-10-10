import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import * as _ from '../src/connect-slack'
import type { CanConnectSlackEnv } from '../src/feature-flags'
import { connectSlackMatch, connectSlackStartMatch, myDetailsMatch } from '../src/routes'
import type { EditSlackUserIdEnv } from '../src/slack-user-id'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('connectSlack', () => {
  describe('when Slack can be connected', () => {
    describe('when the user is logged in', () => {
      test.prop([fc.oauth(), fc.user(), fc.connection()])(
        'when the Slack is not already connected',
        async (oauth, user, connection) => {
          const canConnectSlack = jest.fn<CanConnectSlackEnv['canConnectSlack']>(_ => true)

          const actual = await runMiddleware(
            _.connectSlack({
              canConnectSlack,
              isSlackUser: () => TE.right(false),
              getUser: () => M.of(user),
              oauth,
              publicUrl: new URL('http://example.com'),
            }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.OK },
              { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
              { type: 'setBody', body: expect.anything() },
            ]),
          )
          expect(canConnectSlack).toHaveBeenCalledWith(user)
        },
      )

      test.prop([fc.oauth(), fc.user(), fc.connection()])(
        'when the Slack is connected',
        async (oauth, user, connection) => {
          const actual = await runMiddleware(
            _.connectSlack({
              canConnectSlack: () => true,
              isSlackUser: () => TE.right(true),
              getUser: () => M.of(user),
              oauth,
              publicUrl: new URL('http://example.com'),
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

      test.prop([fc.oauth(), fc.user(), fc.connection()])(
        "when the Slack user can't be loaded",
        async (oauth, user, connection) => {
          const actual = await runMiddleware(
            _.connectSlack({
              canConnectSlack: () => true,
              isSlackUser: () => TE.left('unavailable'),
              getUser: () => M.of(user),
              oauth,
              publicUrl: new URL('http://example.com'),
            }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.ServiceUnavailable },
              { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
              { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
              { type: 'setBody', body: expect.anything() },
            ]),
          )
        },
      )
    })
  })

  test.prop([fc.oauth(), fc.user(), fc.connection()])(
    'when Slack cannot be connected',
    async (oauth, user, connection) => {
      const actual = await runMiddleware(
        _.connectSlack({
          canConnectSlack: () => false,
          isSlackUser: shouldNotBeCalled,
          getUser: () => M.of(user),
          oauth,
          publicUrl: new URL('http://example.com'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.connectSlack({
          canConnectSlack: shouldNotBeCalled,
          isSlackUser: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          oauth,
          publicUrl,
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
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})

describe('connectSlackStart', () => {
  test.prop([fc.oauth(), fc.oauth(), fc.uuid(), fc.string(), fc.user(), fc.connection()])(
    'when Slack can be connected',
    async (oauth, slackOauth, uuid, signedValue, user, connection) => {
      const generateUuid = jest.fn<_.GenerateUuidEnv['generateUuid']>(() => uuid)
      const signValue = jest.fn<_.SignValueEnv['signValue']>(_ => signedValue)

      const actual = await runMiddleware(
        _.connectSlackStart({
          canConnectSlack: () => true,
          generateUuid,
          getUser: () => M.of(user),
          oauth,
          publicUrl: new URL('http://example.com'),
          signValue,
          slackOauth,
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
                redirect_uri: slackOauth.redirectUri.href,
                user_scope: 'users.profile:read',
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

  test.prop([fc.oauth(), fc.oauth(), fc.user(), fc.connection()])(
    'when Slack cannot be connected',
    async (oauth, slackOauth, user, connection) => {
      const actual = await runMiddleware(
        _.connectSlackStart({
          canConnectSlack: () => false,
          generateUuid: shouldNotBeCalled,
          getUser: () => M.of(user),
          oauth,
          publicUrl: new URL('http://example.com'),
          signValue: shouldNotBeCalled,
          slackOauth,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, slackOauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.connectSlackStart({
          canConnectSlack: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          oauth,
          publicUrl,
          signValue: shouldNotBeCalled,
          slackOauth,
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
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(connectSlackMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
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
    async (code, user, oauth, userId, scopes, accessToken, state, [signedState, connection]) => {
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
                  redirect_uri: oauth.redirectUri.href,
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
          saveSlackUserId,
          slackOauth: oauth,
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
    fc.oauth(),
    fc.string(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
  ])('when the access token cannot be decoded', async (code, user, oauth, accessToken, state, connection) => {
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
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
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
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.string(),
    fc.string(),
    fc.connection({
      headers: fc.record({ Cookie: fc.lorem() }, { withDeletedKeys: true }),
    }),
  ])("when the state doesn't match", async (code, user, oauth, state, unsignedState, connection) => {
    const actual = await runMiddleware(
      _.connectSlackCode(
        code,
        state,
      )({
        fetch: shouldNotBeCalled,
        getUser: () => M.of(user),
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
        unsignValue: () => O.some(unsignedState),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
  ])("when the state can't be unsigned", async (code, user, oauth, state, connection) => {
    const actual = await runMiddleware(
      _.connectSlackCode(
        code,
        state,
      )({
        fetch: shouldNotBeCalled,
        getUser: () => M.of(user),
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
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
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
    fc
      .lorem()
      .chain(state =>
        fc.tuple(fc.constant(state), fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
      ),
  ])('when the response has a non-200/404 status code', async (code, user, oauth, accessToken, [state, connection]) => {
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
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
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
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.string(),
    fc.user(),
    fc.oauth(),
    fc.error(),
    fc.string(),
    fc.lorem().chain(state => fc.connection({ headers: fc.constant({ Cookie: `slack-state=${state}` }) })),
  ])('when fetch throws an error', async (code, user, oauth, error, state, connection) => {
    const slackUserIdStore = new Keyv()

    const actual = await runMiddleware(
      _.connectSlackCode(
        code,
        state,
      )({
        fetch: () => Promise.reject(error),
        getUser: () => M.of(user),
        saveSlackUserId: shouldNotBeCalled,
        slackOauth: oauth,
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
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(await slackUserIdStore.has(user.orcid)).toBeFalsy()
  })
})

describe('connectSlackError', () => {
  test.prop([fc.either(fc.oneof(fc.error(), fc.constant('no-session' as const)), fc.user()), fc.connection()])(
    'with an access_denied error',
    async (user, connection) => {
      const actual = await runMiddleware(
        _.connectSlackError('access_denied')({ getUser: () => M.fromEither(user) }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Forbidden },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([
    fc.either(fc.oneof(fc.error(), fc.constant('no-session' as const)), fc.user()),
    fc.string(),
    fc.connection(),
  ])('with an unknown error', async (user, error, connection) => {
    const actual = await runMiddleware(_.connectSlackError(error)({ getUser: () => M.fromEither(user) }), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'clearCookie', name: 'slack-state', options: { httpOnly: true } },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
