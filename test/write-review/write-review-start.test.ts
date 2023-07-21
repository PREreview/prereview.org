import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewAlreadyWrittenMatch, writeReviewStartMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewStart', () => {
  describe('when there is a session', () => {
    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.boolean(),
    ])(
      'there is a form',
      async (oauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, canRapidReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewStart(preprintId)({
            canRapidReview: () => canRapidReview,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            oauth,
            publicUrl,
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
      },
    )

    test.prop([
      fc.record({
        authorizeUrl: fc.url(),
        clientId: fc.string(),
        clientSecret: fc.string(),
        redirectUri: fc.url(),
        tokenUrl: fc.url(),
      }),
      fc.origin(),
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.user(),
    ])("there isn't a form", async (oauth, publicUrl, preprintId, preprintTitle, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewStart(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          oauth,
          publicUrl,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewAlreadyWrittenMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    })
  })

  test.prop([
    fc.record({
      authorizeUrl: fc.url(),
      clientId: fc.string(),
      clientSecret: fc.string(),
      redirectUri: fc.url(),
      tokenUrl: fc.url(),
    }),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
  ])("when there isn't a session", async (oauth, publicUrl, preprintId, preprintTitle, connection) => {
    const actual = await runMiddleware(
      _.writeReviewStart(preprintId)({
        canRapidReview: shouldNotBeCalled,
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
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
              state: new URL(format(writeReviewStartMatch.formatter, { id: preprintTitle.id }), publicUrl).href,
            }).toString()}`,
            oauth.authorizeUrl,
          ).href,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.record({
      authorizeUrl: fc.url(),
      clientId: fc.string(),
      clientSecret: fc.string(),
      redirectUri: fc.url(),
      tokenUrl: fc.url(),
    }),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection(),
  ])('when the preprint cannot be loaded', async (oauth, publicUrl, preprintId, connection) => {
    const actual = await runMiddleware(
      _.writeReviewStart(preprintId)({
        canRapidReview: shouldNotBeCalled,
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left('unavailable'),
        getUser: () => M.left('no-session'),
        oauth,
        publicUrl,
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
  })

  test.prop([
    fc.record({
      authorizeUrl: fc.url(),
      clientId: fc.string(),
      clientSecret: fc.string(),
      redirectUri: fc.url(),
      tokenUrl: fc.url(),
    }),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection(),
    fc.cookieName(),
    fc.string(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])(
    'when the preprint is not found',
    async (oauth, publicUrl, preprintId, connection, sessionCookie, secret, user) => {
      const actual = await runMiddleware(
        _.writeReviewStart(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.fromEither(user),
          oauth,
          publicUrl,
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
})
