import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
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

  test.prop([fc.connection()])('notFound', async connection => {
    const actual = await runMiddleware(_.notFound({}), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([fc.connection()])('serviceUnavailable', async connection => {
    const actual = await runMiddleware(_.serviceUnavailable({}), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
