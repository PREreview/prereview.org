import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewConduct', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ body: fc.record({ conduct: fc.conduct() }), method: fc.constant('POST') }),
    fc.user(),
    fc.boolean(),
    fc.completedForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
        canRapidReview: () => canRapidReview,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ conduct: 'yes' })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ body: fc.record({ conduct: fc.conduct() }), method: fc.constant('POST') }),
    fc.user(),
    fc.boolean(),
    fc.incompleteForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
        canRapidReview: () => canRapidReview,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ conduct: 'yes' })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewConduct(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewConduct(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewConduct(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection) => {
      const actual = await runMiddleware(
        _.writeReviewConduct(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({
      body: fc.record({ conduct: fc.string() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.form(),
  ])('without agreement to the Code of Conduct', async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
        canRapidReview: shouldNotBeCalled,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.BadRequest },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
