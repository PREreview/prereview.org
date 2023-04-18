import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/middleware'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('middleware', () => {
  test.prop([fc.connection(), fc.cookieName(), fc.string()])('seeOther', async (connection, location) => {
    const actual = await runMiddleware(_.seeOther(location), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        { type: 'setHeader', name: 'Location', value: location },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.connection(), fc.string()])('movedPermanently', async (connection, location) => {
    const actual = await runMiddleware(_.movedPermanently(location), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.MovedPermanently },
        { type: 'setHeader', name: 'Location', value: location },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
    'notFound',
    async (connection, user) => {
      const actual = await runMiddleware(_.notFound({ getUser: () => M.fromEither(user) }), connection)()

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

  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
    'serviceUnavailable',
    async (connection, user) => {
      const actual = await runMiddleware(_.serviceUnavailable({ getUser: () => M.fromEither(user) }), connection)()

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
