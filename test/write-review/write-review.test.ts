import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewStartMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test.prop([fc.origin(), fc.indeterminatePreprintId(), fc.preprint(), fc.connection(), fc.form(), fc.user()])(
      'there is a form already',
      async (publicUrl, preprintId, preprint, connection, newReview, user) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprint.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReview(preprintId)({
            formStore,
            getPreprint: () => TE.right(preprint),
            getUser: () => M.of(user),
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
              value: format(writeReviewStartMatch.formatter, { id: preprint.id }),
            },
            { type: 'endResponse' },
          ]),
        )
      },
    )

    test.prop([fc.origin(), fc.indeterminatePreprintId(), fc.preprint(), fc.connection(), fc.user()])(
      "there isn't a form",
      async (publicUrl, preprintId, preprint, connection, user) => {
        const actual = await runMiddleware(
          _.writeReview(preprintId)({
            formStore: new Keyv(),
            getPreprint: () => TE.right(preprint),
            getUser: () => M.of(user),
            publicUrl,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            {
              type: 'setHeader',
              name: 'Link',
              value: `<${publicUrl.href.slice(0, -1)}${format(writeReviewMatch.formatter, {
                id: preprint.id,
              })}>; rel="canonical"`,
            },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )
  })

  test.prop([fc.origin(), fc.indeterminatePreprintId(), fc.preprint(), fc.connection(), fc.cookieName(), fc.string()])(
    "when there isn't a session",
    async (publicUrl, preprintId, preprint, connection) => {
      const actual = await runMiddleware(
        _.writeReview(preprintId)({
          formStore: new Keyv(),
          getPreprint: () => TE.right(preprint),
          getUser: () => M.left('no-session'),
          publicUrl,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          {
            type: 'setHeader',
            name: 'Link',
            value: `<${publicUrl.href.slice(0, -1)}${format(writeReviewMatch.formatter, {
              id: preprint.id,
            })}>; rel="canonical"`,
          },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint cannot be loaded', async (publicUrl, preprintId, connection, user) => {
    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore: new Keyv(),
        getPreprint: () => TE.left('unavailable'),
        getUser: () => M.fromEither(user),
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
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint is not found', async (publicUrl, preprintId, connection, user) => {
    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore: new Keyv(),
        getPreprint: () => TE.left('not-found'),
        getUser: () => M.fromEither(user),
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
  })
})
